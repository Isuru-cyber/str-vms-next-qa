import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "view_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const plantId = searchParams.get("plantId");
    const vehicleId = searchParams.get("vehicleId");
    const paymentBasis = searchParams.get("paymentBasis");
    const deliveryWindow = searchParams.get("deliveryWindow");
    const planningType = searchParams.get("planningType");
    const requestedByDept = searchParams.get("requestedByDept");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};

    // 1. Plant access scoping for non-admins
    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      where.tripRequests = {
        some: {
          request: {
            plantId: { in: user.plantIds },
          },
        },
      };
    } else if (!isAdmin(user) && (!user.plantIds || user.plantIds.length === 0)) {
      where.id = -1;
    }

    // 2. Specific Plant filter
    if (plantId && plantId !== "ALL") {
      where.tripRequests = {
        some: {
          request: {
            plantId: Number(plantId),
          },
        },
      };
    }

    // 3. Date Range Filter (based on createdAt)
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(`${startDate}T00:00:00.000Z`);
      }
      if (endDate) {
        where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
      }
    }

    // 4. Vehicle filter
    if (vehicleId && vehicleId !== "ALL") {
      where.vehicleId = Number(vehicleId);
    }

    // 5. Payment Basis filter (FIXED, KM_BASED, ADHOC)
    if (paymentBasis && paymentBasis !== "ALL") {
      where.paymentBasis = paymentBasis;
    }

    // 6. Classification filters
    if (deliveryWindow && deliveryWindow !== "ALL") {
      where.deliveryWindow = deliveryWindow;
    }
    if (planningType && planningType !== "ALL") {
      where.planningType = planningType;
    }
    if (requestedByDept && requestedByDept !== "ALL") {
      where.requestedByDept = requestedByDept;
    }

    // 7. Status filter
    if (status && status !== "ALL") {
      where.status = status;
    }

    // 8. Text Search
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { tripNo: { contains: q, mode: "insensitive" } },
        { vehicle: { vehicleNumber: { contains: q, mode: "insensitive" } } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
        { route: { routeName: { contains: q, mode: "insensitive" } } },
        {
          tripRequests: {
            some: {
              request: {
                requestCode: { contains: q, mode: "insensitive" },
              },
            },
          },
        },
      ];
    }

    // Query DeliveryTrips with complete relations
    const [trips, masterOptions] = await Promise.all([
      prisma.deliveryTrip.findMany({
        where,
        take: 500,
        orderBy: { id: "desc" },
        include: {
          vehicle: {
            include: {
              defaultLocation: true,
            },
          },
          driver: true,
          route: {
            include: {
              originLocation: true,
            },
          },
          gatePasses: {
            orderBy: { id: "asc" },
          },
          reconciliations: {
            orderBy: { id: "desc" },
            take: 1,
          },
          tripRequests: {
            include: {
              request: {
                include: {
                  plant: true,
                  fromLocation: true,
                  toLocation: true,
                  subOperation: true,
                  requester: {
                    select: { id: true, name: true, email: true, userCode: true },
                  },
                },
              },
            },
            orderBy: { loadingSequence: "asc" },
          },
        },
      }),

      prisma.masterData.findMany({
        where: {
          active: 1,
          category: {
            code: { in: ["DELIVERY_WINDOW", "PLANNING_TYPE", "REQUESTED_BY"] },
          },
        },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    // Group master options by category code
    const deliveryWindows = masterOptions
      .filter((m) => m.category.code === "DELIVERY_WINDOW")
      .map((m) => ({ code: m.code, name: m.name }));
    const planningTypes = masterOptions
      .filter((m) => m.category.code === "PLANNING_TYPE")
      .map((m) => ({ code: m.code, name: m.name }));
    const requestedByDepts = masterOptions
      .filter((m) => m.category.code === "REQUESTED_BY")
      .map((m) => ({ code: m.code, name: m.name }));

    // Compute aggregated analytics
    const totalTrips = trips.length;
    let plannedCount = 0;
    let specialCount = 0;
    let adhocCount = 0;
    let companyFleetCount = 0;

    const deliveryWindowCounts: Record<string, number> = {
      "Morning - Sameday Unloading": 0,
      "Evening - Next Day Unloading": 0,
      "Overnight Delivery": 0,
      "Not Specified": 0,
    };

    let totalPlannedKm = 0;
    let totalActualKm = 0;
    let totalTripCost = 0;
    let totalNetKg = 0;
    let totalNetCbm = 0;
    let totalBoxCount = 0;

    for (const t of trips) {
      // Planning type
      const pType = (t.planningType || "Planned").toLowerCase();
      if (pType.includes("special")) {
        specialCount++;
      } else {
        plannedCount++;
      }

      // Ad-hoc vs company fleet
      const isAdhoc =
        t.paymentBasis === "ADHOC" ||
        t.vehicle?.ownershipType === "ADHOC" ||
        t.vehicle?.vehicleType?.toUpperCase()?.includes("AD-HOC");
      if (isAdhoc) {
        adhocCount++;
      } else {
        companyFleetCount++;
      }

      // Delivery window
      if (t.deliveryWindow && deliveryWindowCounts[t.deliveryWindow] !== undefined) {
        deliveryWindowCounts[t.deliveryWindow]++;
      } else if (t.deliveryWindow) {
        deliveryWindowCounts[t.deliveryWindow] =
          (deliveryWindowCounts[t.deliveryWindow] || 0) + 1;
      } else {
        deliveryWindowCounts["Not Specified"]++;
      }

      // Numeric sums
      totalPlannedKm += Number(t.plannedKm || 0);
      totalActualKm += Number(t.actualKm || 0);
      totalTripCost += Number(t.totalTripCost || 0);

      for (const tr of t.tripRequests) {
        if (tr.request) {
          totalNetKg += Number(tr.request.requiredKg || 0);
          totalNetCbm += Number(tr.request.requiredCbm || 0);
          totalBoxCount += Number(tr.request.boxCount || 0);
        }
      }
    }

    const analytics = {
      totalTrips,
      plannedCount,
      plannedPercent: totalTrips > 0 ? ((plannedCount / totalTrips) * 100).toFixed(1) : "0",
      specialCount,
      specialPercent: totalTrips > 0 ? ((specialCount / totalTrips) * 100).toFixed(1) : "0",
      adhocCount,
      adhocPercent: totalTrips > 0 ? ((adhocCount / totalTrips) * 100).toFixed(1) : "0",
      companyFleetCount,
      companyFleetPercent:
        totalTrips > 0 ? ((companyFleetCount / totalTrips) * 100).toFixed(1) : "0",
      deliveryWindowCounts,
      totalPlannedKm: Math.round(totalPlannedKm),
      totalActualKm: Math.round(totalActualKm),
      totalTripCost: Math.round(totalTripCost),
      totalNetKg: Math.round(totalNetKg),
      totalNetCbm: parseFloat(totalNetCbm.toFixed(2)),
      totalBoxCount,
    };

    return NextResponse.json({
      success: true,
      trips,
      analytics,
      masterOptions: {
        deliveryWindows,
        planningTypes,
        requestedByDepts,
      },
    });
  } catch (error: any) {
    console.error("Error fetching full trip details:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch full trip details." },
      { status: 500 }
    );
  }
}
