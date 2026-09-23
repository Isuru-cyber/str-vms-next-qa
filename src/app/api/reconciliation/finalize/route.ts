import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ adminOnly: true });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { tripId, notes } = body;

    if (!tripId) {
      return NextResponse.json({ success: false, message: "Trip ID is required." }, { status: 400 });
    }

    const tripIdNum = Number(tripId);

    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripIdNum },
      include: {
        vehicle: true,
        driver: true,
        reconciliations: true,
        tripRequests: {
          include: {
            request: {
              include: { toLocation: true },
            },
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
    }

    if (["FINALIZED", "CLOSED"].includes(trip.status)) {
      return NextResponse.json({ success: false, message: `Trip is already ${trip.status}.` }, { status: 400 });
    }

    if (trip.status !== "RECONCILED" && (!trip.reconciliations || trip.reconciliations.length === 0)) {
      return NextResponse.json(
        { success: false, message: "Cannot finalize an unreconciled trip. Please reconcile invoices first." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Seed initial InvoicePod entries so they appear in POD Management
      for (const tr of trip.tripRequests) {
        const r = tr.request;
        if (!r || !r.invoiceNumbers) continue;
        const rawInvoices = r.invoiceNumbers
          .split(/[\r\n,]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);

        for (const invNo of rawInvoices) {
          const existing = await tx.invoicePod.findFirst({
            where: { tripId: tripIdNum, invoiceNumber: invNo },
          });
          if (!existing) {
            await tx.invoicePod.create({
              data: {
                tripId: tripIdNum,
                requestId: r.id,
                invoiceNumber: invNo,
                vehicleNumber: trip.vehicle?.vehicleNumber || null,
                driverName: trip.driver?.name || null,
                driverMobile: trip.driver?.mobile || null,
                locationName: r.toLocation?.locationName || null,
                isReceived: false,
              },
            });
          }
        }
      }

      // Check if PODs are already 100% received
      const totalPods = await tx.invoicePod.count({ where: { tripId: tripIdNum } });
      const pendingPods = await tx.invoicePod.count({ where: { tripId: tripIdNum, isReceived: false } });
      const allPodsReceived = totalPods > 0 && pendingPods === 0;
      const targetStatus = allPodsReceived ? "CLOSED" : "FINALIZED";

      // 2. Mark trip as FINALIZED (or CLOSED if all PODs received)
      await tx.deliveryTrip.update({
        where: { id: tripIdNum },
        data: {
          status: targetStatus,
          completedBy: user.id,
          completedAt: new Date(),
          adminRemarks: notes
            ? trip.adminRemarks
              ? `${trip.adminRemarks} | Finalize: ${notes}`
              : `Finalize: ${notes}`
            : trip.adminRemarks,
        },
      });

      // 3. Mark linked requests as FINALIZED (or CLOSED)
      const reqIds = trip.tripRequests.map((tr: any) => tr.requestId);
      if (reqIds.length > 0) {
        await tx.vehicleRequest.updateMany({
          where: { id: { in: reqIds } },
          data: { status: targetStatus },
        });
      }

      // 4. Reset vehicle to AVAILABLE if no other active trips exist
      if (trip.vehicleId) {
        const activeVehicleTrips = await tx.deliveryTrip.count({
          where: {
            vehicleId: trip.vehicleId,
            id: { not: tripIdNum },
            status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
          },
        });

        if (activeVehicleTrips === 0) {
          await tx.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: "AVAILABLE" },
          });
        }
      }

      // 5. Reset driver to AVAILABLE if no other active trips exist
      if (trip.driverId) {
        const activeDriverTrips = await tx.deliveryTrip.count({
          where: {
            driverId: trip.driverId,
            id: { not: tripIdNum },
            status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
          },
        });

        if (activeDriverTrips === 0) {
          await tx.driver.update({
            where: { id: trip.driverId },
            data: { status: "AVAILABLE" },
          });
        }
      }
    });

    await ActivityLogger.log(
      "DELIVERY_TRIPS",
      "TRIP_FINALIZED_AND_AUDITED",
      trip.tripNo,
      `Trip finalized and approved into financial reports. Notes: ${notes || "None"}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Trip ${trip.tripNo} finalized successfully! Locked into financial reports.`,
    });
  } catch (err: any) {
    console.error("Finalize trip error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Operation failed." }, { status: 500 });
  }
}
