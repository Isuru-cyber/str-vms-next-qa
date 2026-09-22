import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "view_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const where: any = {
      status: { in: ["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"] },
    };

    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      where.tripRequests = {
        some: {
          request: {
            plantId: { in: user.plantIds },
          },
        },
      };
    }

    // 1. Fetch all finalized delivery trips with linked requests and invoices
    const trips = await prisma.deliveryTrip.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
        tripRequests: {
          include: {
            request: {
              include: {
                plant: true,
                toLocation: true,
              },
            },
          },
        },
        pods: true,
      },
      orderBy: { id: "desc" },
    });

    // 2. Flatten and map each commercial invoice associated with a trip
    const invoiceList: any[] = [];

    for (const trip of trips) {
      const tripPodsMap = new Map<string, any>();
      (trip.pods || []).forEach((p: any) => {
        tripPodsMap.set(p.invoiceNumber.trim().toUpperCase(), p);
      });

      for (const tr of trip.tripRequests) {
        const req = tr.request;
        if (!req || !req.invoiceNumbers) continue;

        // Invoices can be separated by newlines or commas
        const rawInvoices = req.invoiceNumbers
          .split(/[\r\n,]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);

        for (const rawInv of rawInvoices) {
          const invUpper = rawInv.toUpperCase();
          const existingPod = tripPodsMap.get(invUpper);

          invoiceList.push({
            id: existingPod ? existingPod.id : `virtual_${trip.id}_${invUpper}`,
            dbId: existingPod?.id || null,
            tripId: trip.id,
            tripNo: trip.tripNo,
            tripStatus: trip.status,
            requestId: req.id,
            requestCode: req.requestCode,
            invoiceNumber: rawInv,
            vehicleNumber: trip.vehicle?.vehicleNumber || "Unassigned",
            vehicleType: trip.vehicle?.vehicleType || "Fleet Vehicle",
            driverName: trip.driver?.name || "Unassigned",
            driverMobile: trip.driver?.mobile || "-",
            locationName: req.toLocation?.locationName || "Factory Customer Bay",
            plantCode: req.plant?.code || "STR",
            dispatchedDate: trip.createdAt.toISOString().slice(0, 10),
            isReceived: existingPod ? existingPod.isReceived : false,
            receivedAt: existingPod?.receivedAt ? existingPod.receivedAt.toISOString() : null,
            receivedByName: existingPod?.receivedByName || null,
            remarks: existingPod?.remarks || "",
          });
        }
      }
    }

    // 3. Compute KPI Summary Metrics
    const totalInvoices = invoiceList.length;
    const receivedCount = invoiceList.filter((i) => i.isReceived).length;
    const pendingCount = totalInvoices - receivedCount;
    const returnRate = totalInvoices > 0 ? Math.round((receivedCount / totalInvoices) * 100) : 100;

    return NextResponse.json({
      success: true,
      invoices: invoiceList,
      stats: {
        totalInvoices,
        receivedCount,
        pendingCount,
        returnRate,
      },
    });
  } catch (error: any) {
    console.error("Failed to load POD records:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load POD data." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "edit_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No updates provided." },
        { status: 400 }
      );
    }

    let savedCount = 0;
    const affectedTripIds = new Set<number>();

    for (const item of updates) {
      const {
        tripId,
        requestId,
        invoiceNumber,
        vehicleNumber,
        driverName,
        driverMobile,
        locationName,
        isReceived,
        remarks,
      } = item;

      if (!tripId || !invoiceNumber) continue;
      const tId = Number(tripId);
      affectedTripIds.add(tId);

      if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
        const trip = await prisma.deliveryTrip.findUnique({
          where: { id: tId },
          include: { tripRequests: { include: { request: true } } },
        });
        const hasAccess = trip?.tripRequests.some((tr: any) => tr.request && canAccessPlant(user, tr.request.plantId));
        if (!hasAccess && (trip?.tripRequests.length ?? 0) > 0) continue;
      }

      const receivedAt = isReceived ? new Date() : null;
      const receivedByName = isReceived ? user.name : null;
      const receivedBy = isReceived ? user.id : null;

      await prisma.invoicePod.upsert({
        where: {
          tripId_invoiceNumber: {
            tripId: tId,
            invoiceNumber: String(invoiceNumber).trim(),
          },
        },
        create: {
          tripId: tId,
          requestId: requestId ? Number(requestId) : null,
          invoiceNumber: String(invoiceNumber).trim(),
          vehicleNumber: vehicleNumber || null,
          driverName: driverName || null,
          driverMobile: driverMobile || null,
          locationName: locationName || null,
          isReceived: Boolean(isReceived),
          receivedAt,
          receivedBy,
          receivedByName,
          remarks: remarks || null,
        },
        update: {
          isReceived: Boolean(isReceived),
          receivedAt: isReceived ? receivedAt : null,
          receivedBy: isReceived ? receivedBy : null,
          receivedByName: isReceived ? receivedByName : null,
          remarks: remarks !== undefined ? remarks : undefined,
        },
      });

      savedCount++;
    }

    // Auto-Close Lifecycle Check: If trip is FINALIZED and all declared invoices verified, set status = CLOSED
    for (const tId of affectedTripIds) {
      const currentTrip = await prisma.deliveryTrip.findUnique({
        where: { id: tId },
        include: {
          tripRequests: {
            include: { request: true },
          },
          pods: true,
        },
      });

      if (!currentTrip || currentTrip.status !== "FINALIZED") continue;

      // Collect all required invoices from all requests linked to this trip
      const requiredInvoices = new Set<string>();
      for (const tr of currentTrip.tripRequests) {
        if (tr.request?.invoiceNumbers) {
          const invs = tr.request.invoiceNumbers
            .split(/[\r\n,]+/)
            .map((s: string) => s.trim().toUpperCase())
            .filter(Boolean);
          invs.forEach((inv: string) => requiredInvoices.add(inv));
        }
      }

      // If trip has required invoices, verify that every invoice is recorded in pods and isReceived === true
      if (requiredInvoices.size > 0) {
        const podMap = new Map<string, boolean>();
        for (const p of currentTrip.pods) {
          podMap.set(p.invoiceNumber.trim().toUpperCase(), p.isReceived);
        }

        const allReceived = Array.from(requiredInvoices).every(
          (inv: string) => podMap.get(inv) === true
        );

        if (allReceived) {
          await prisma.deliveryTrip.update({
            where: { id: tId },
            data: { status: "CLOSED" },
          });

          const reqIds = currentTrip.tripRequests.map((tr: any) => tr.requestId);
          if (reqIds.length > 0) {
            await prisma.vehicleRequest.updateMany({
              where: { id: { in: reqIds } },
              data: { status: "CLOSED" },
            });
          }

          try {
            await prisma.activityLog.create({
              data: {
                userId: user.id,
                action: "TRIP_CLOSED_POD_COMPLETE",
                module: "POD",
                recordId: String(tId),
                details: `Trip #${currentTrip.tripNo} and ${reqIds.length} request(s) closed automatically after all ${requiredInvoices.size} invoice POD(s) were verified received.`,
              },
            });
          } catch (logErr) {
            console.error("Failed to log auto-close activity:", logErr);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      savedCount,
      message: `Successfully updated ${savedCount} POD record(s).`,
    });
  } catch (error: any) {
    console.error("Failed to save POD acknowledgment:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save POD status." },
      { status: 500 }
    );
  }
}
