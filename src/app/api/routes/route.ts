import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, can } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const searchParams = request.nextUrl.searchParams;
    const bg = searchParams.get("bg");
    const query = searchParams.get("q");

    const where: any = {};
    if (bg && bg !== "ALL") {
      where.businessGroup = bg;
    }
    if (query) {
      where.OR = [
        { routeCode: { contains: query, mode: "insensitive" } },
        { routeName: { contains: query, mode: "insensitive" } },
      ];
    }

    const routes = await prisma.route.findMany({
      where,
      orderBy: { routeCode: "asc" },
      include: {
        originLocation: true,
        stops: {
          include: { location: true },
          orderBy: { stopSequence: "asc" },
        },
      },
    });

    return NextResponse.json({ status: "success", data: routes });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    if (!isAdmin(user) && !can(user, "dispatch_trips") && !can(user, "allocate_trips")) {
      return NextResponse.json(
        { message: "Forbidden: Dispatcher privileges required to create routes." },
        { status: 403 }
      );
    }

    const body = await request.json();
    let {
      routeCode,
      routeName,
      businessGroup = "ELASTIC",
      routeGroup = "DIRECT",
      operationType,
      originLocationId,
      totalDistanceKm,
      remarks,
      active = 1,
      stops = [],
    } = body;

    if (!originLocationId) {
      return NextResponse.json({ message: "Origin location is required" }, { status: 400 });
    }
    if (!routeName || !routeName.trim()) {
      return NextResponse.json({ message: "Route name is required" }, { status: 400 });
    }

    if (!routeCode || !routeCode.trim()) {
      const count = await prisma.route.count();
      routeCode = `RTE-${String(count + 1).padStart(4, "0")}`;
    }

    const originLocId = parseInt(originLocationId, 10);
    const totalKm = totalDistanceKm ? parseFloat(totalDistanceKm) : 0;

    const createdRoute = await prisma.$transaction(async (tx: any) => {
      const r = await tx.route.create({
        data: {
          routeCode: routeCode.trim().toUpperCase(),
          routeName: routeName.trim(),
          businessGroup: businessGroup || "ELASTIC",
          routeGroup: routeGroup || "DIRECT",
          operationType: operationType || null,
          originLocationId: originLocId,
          totalDistanceKm: totalKm,
          remarks: remarks || null,
          active: active ? 1 : 0,
        },
      });

      // Stop 0: origin
      await tx.routeStop.create({
        data: {
          routeId: r.id,
          locationId: originLocId,
          stopSequence: 0,
          legDistanceKm: 0,
          cumulativeDistanceKm: 0,
          active: 1,
        },
      });

      // Stops 1..N
      let prevKm = 0;
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        if (!s.locationId) continue;
        const sLocId = parseInt(s.locationId, 10);
        const cumKm = parseFloat(s.cumulativeDistanceKm || "0");
        const legKm = Math.max(0, parseFloat((cumKm - prevKm).toFixed(2)));
        prevKm = cumKm;

        await tx.routeStop.create({
          data: {
            routeId: r.id,
            locationId: sLocId,
            stopSequence: i + 1,
            legDistanceKm: legKm,
            cumulativeDistanceKm: cumKm,
            active: 1,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE_ROUTE",
          module: "ROUTE_MASTER",
          recordId: String(r.id),
          details: `Created route ${r.routeCode} (${r.routeName}) with ${stops.length} stop(s) - Total ${totalKm} KM`,
        },
      });

      return r;
    });

    try {
      await syncDirectRoutes(createdRoute.id);
    } catch (syncErr) {
      console.error("Error auto-syncing direct routes:", syncErr);
    }

    return NextResponse.json({ status: "success", data: createdRoute });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    if (!isAdmin(user) && !can(user, "dispatch_trips") && !can(user, "allocate_trips")) {
      return NextResponse.json(
        { message: "Forbidden: Dispatcher privileges required to update routes." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      routeCode,
      routeName,
      businessGroup = "ELASTIC",
      routeGroup = "DIRECT",
      operationType,
      originLocationId,
      totalDistanceKm,
      remarks,
      active = 1,
      stops = [],
    } = body;

    const routeId = parseInt(id, 10);
    const originLocId = parseInt(originLocationId, 10);
    const totalKm = totalDistanceKm ? parseFloat(totalDistanceKm) : 0;

    const updated = await prisma.$transaction(async (tx: any) => {
      const r = await tx.route.update({
        where: { id: routeId },
        data: {
          routeCode: routeCode ? routeCode.trim().toUpperCase() : undefined,
          routeName: routeName ? routeName.trim() : undefined,
          businessGroup: businessGroup || "ELASTIC",
          routeGroup: routeGroup || "DIRECT",
          operationType: operationType || null,
          originLocationId: originLocId,
          totalDistanceKm: totalKm,
          remarks: remarks || null,
          active: active ? 1 : 0,
        },
      });

      // Delete existing stops
      await tx.routeStop.deleteMany({
        where: { routeId },
      });

      // Stop 0: origin
      await tx.routeStop.create({
        data: {
          routeId: r.id,
          locationId: originLocId,
          stopSequence: 0,
          legDistanceKm: 0,
          cumulativeDistanceKm: 0,
          active: 1,
        },
      });

      // Stops 1..N
      let prevKm = 0;
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        if (!s.locationId) continue;
        const sLocId = parseInt(s.locationId, 10);
        const cumKm = parseFloat(s.cumulativeDistanceKm || "0");
        const legKm = Math.max(0, parseFloat((cumKm - prevKm).toFixed(2)));
        prevKm = cumKm;

        await tx.routeStop.create({
          data: {
            routeId: r.id,
            locationId: sLocId,
            stopSequence: i + 1,
            legDistanceKm: legKm,
            cumulativeDistanceKm: cumKm,
            active: 1,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_ROUTE",
          module: "ROUTE_MASTER",
          recordId: String(r.id),
          details: `Updated route ${r.routeCode} (${r.routeName}) with ${stops.length} stop(s) - Total ${totalKm} KM`,
        },
      });

      return r;
    });

    try {
      await syncDirectRoutes(updated.id);
    } catch (syncErr) {
      console.error("Error auto-syncing direct routes:", syncErr);
    }

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ adminOnly: true });
    if (auth.error) return auth.error;
    const user = auth.user;

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    const routeId = parseInt(id, 10);

    const [tripsCount, requestsCount] = await Promise.all([
      prisma.deliveryTrip.count({ where: { routeId } }),
      prisma.vehicleRequest.count({ where: { routeId } }),
    ]);

    if (tripsCount > 0 || requestsCount > 0) {
      await prisma.route.update({
        where: { id: routeId },
        data: { active: 0 },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "DEACTIVATE_ROUTE",
          module: "ROUTE_MASTER",
          recordId: String(routeId),
          details: `Deactivated route ID ${routeId} (history: ${tripsCount} trips, ${requestsCount} requests)`,
        },
      });

      return NextResponse.json({
        status: "success",
        message: `Route deactivated (retained in historical records: ${tripsCount} trips).`,
      });
    }

    await prisma.$transaction([
      prisma.routeStop.deleteMany({ where: { routeId } }),
      prisma.route.delete({ where: { id: routeId } }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "DELETE_ROUTE",
          module: "ROUTE_MASTER",
          recordId: String(routeId),
          details: `Permanently deleted route ID ${routeId}`,
        },
      }),
    ]);

    return NextResponse.json({ status: "success", message: "Route deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

async function syncDirectRoutes(routeId: number) {
  const parent = await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      originLocation: true,
      stops: {
        where: { stopSequence: { gt: 0 } },
        include: { location: true },
        orderBy: { stopSequence: "asc" },
      },
    },
  });

  if (!parent || parent.stops.length <= 1) return;

  const originId = parent.originLocationId;
  const originName = parent.originLocation?.locationName || "Origin";

  for (const s of parent.stops) {
    const destLocId = s.locationId;
    const destKm = Number(s.cumulativeDistanceKm) || 0;
    if (destLocId <= 0 || destKm <= 0) continue;

    // Check if a direct route already exists
    const existingDirect = await prisma.route.findFirst({
      where: {
        originLocationId: originId,
        active: 1,
        stops: {
          some: {
            locationId: destLocId,
            stopSequence: 1,
            cumulativeDistanceKm: { gt: 0 },
          },
        },
      },
      include: {
        stops: {
          where: { stopSequence: { gt: 0 } },
        },
      },
    });

    if (existingDirect && existingDirect.stops.length === 1) {
      continue;
    }

    // Auto-generate route code
    const count = await prisma.route.count();
    const nextCode = `RTE-${String(count + 1).padStart(4, "0")}`;
    const directName = `${originName} -> ${s.location?.locationName || "Destination"}`;

    await prisma.$transaction(async (tx: any) => {
      const nr = await tx.route.create({
        data: {
          routeCode: nextCode,
          routeName: directName,
          businessGroup: parent.businessGroup || "ELASTIC",
          routeGroup: "DIRECT",
          operationType: parent.operationType || null,
          originLocationId: originId,
          totalDistanceKm: destKm,
          remarks: `Direct route auto-generated from ${parent.routeCode}`,
          active: 1,
        },
      });

      await tx.routeStop.create({
        data: {
          routeId: nr.id,
          locationId: originId,
          stopSequence: 0,
          legDistanceKm: 0,
          cumulativeDistanceKm: 0,
          active: 1,
        },
      });

      await tx.routeStop.create({
        data: {
          routeId: nr.id,
          locationId: destLocId,
          stopSequence: 1,
          legDistanceKm: destKm,
          cumulativeDistanceKm: destKm,
          active: 1,
        },
      });
    });
  }
}
