import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi({ action: "allocate_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId) {
      return NextResponse.json({ success: false, message: "Invalid trip ID." }, { status: 400 });
    }

    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        tripRequests: {
          include: { request: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
    }

    // Permission check for plant access if not admin
    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      const hasPlantAccess = trip.tripRequests.some(
        (tr: any) => tr.request && canAccessPlant(user, tr.request.plantId)
      );
      if (!hasPlantAccess && trip.tripRequests.length > 0) {
        return NextResponse.json(
          { success: false, message: "Forbidden: You do not have plant access to this trip." },
          { status: 403 }
        );
      }
    }

    if (["COMPLETED", "FINALIZED", "CLOSED"].includes(trip.status)) {
      return NextResponse.json(
        { success: false, message: `Trip #${trip.tripNo} is already in '${trip.status}' status.` },
        { status: 400 }
      );
    }

    const reqIds = trip.tripRequests.map((tr: any) => tr.requestId).filter(Boolean);

    await prisma.$transaction(async (tx: any) => {
      // 1. Update trip status to COMPLETED
      await tx.deliveryTrip.update({
        where: { id: tripId },
        data: {
          status: "COMPLETED",
          completedBy: user.id,
          completedAt: new Date(),
        },
      });

      // 2. Update linked requests to COMPLETED
      if (reqIds.length > 0) {
        await tx.vehicleRequest.updateMany({
          where: { id: { in: reqIds } },
          data: { status: "COMPLETED" },
        });
      }

      // 3. Release vehicle to AVAILABLE
      if (trip.vehicleId) {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "AVAILABLE" },
        });
      }

      // 4. Release driver to AVAILABLE
      if (trip.driverId) {
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: "AVAILABLE" },
        });
      }

      // 5. Audit Log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "QUICK_DISPATCH_COMPLETE",
          module: "TRIPS",
          recordId: String(tripId),
          details: `Trip #${trip.tripNo} marked as COMPLETED via Quick Dispatch Complete. ${reqIds.length} requests completed. Vehicle & Driver released to AVAILABLE.`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Trip #${trip.tripNo} marked COMPLETED. Assigned vehicle & driver released to AVAILABLE.`,
    });
  } catch (error: any) {
    console.error("Error completing trip:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to complete trip." },
      { status: 500 }
    );
  }
}
