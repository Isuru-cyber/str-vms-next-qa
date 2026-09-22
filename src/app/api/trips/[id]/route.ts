import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi({ action: "view_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId) {
      return NextResponse.json({ message: "Invalid trip ID" }, { status: 400 });
    }

    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
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
            stops: {
              include: { location: true },
              orderBy: { stopSequence: "asc" },
            },
          },
        },
        completedByUser: {
          select: { id: true, name: true, email: true, userCode: true },
        },
        tripRequests: {
          include: {
            request: {
              include: {
                plant: true,
                fromLocation: true,
                toLocation: true,
                requester: {
                  select: { id: true, name: true, email: true, userCode: true },
                },
                subOperation: true,
                vehicleType: true,
              },
            },
          },
          orderBy: { loadingSequence: "asc" },
        },
        gatePasses: {
          orderBy: { id: "asc" },
        },
        reconciliations: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    // Check plant access scope for non-admins
    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      const hasPlantAccess = trip.tripRequests.some(
        (tr: any) => tr.request && canAccessPlant(user, tr.request.plantId)
      );
      if (!hasPlantAccess && trip.tripRequests.length > 0) {
        return NextResponse.json(
          { message: "Forbidden: Plant access restricted." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ status: "success", data: trip });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to load trip" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // S-7: Super Admin exclusive deny-list enforcement
    const auth = await authorizeApi({ superAdminOnly: true, action: "delete_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId) {
      return NextResponse.json({ message: "Invalid trip ID" }, { status: 400 });
    }

    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        tripRequests: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      // Release requests back to SUBMITTED
      if (trip.tripRequests && trip.tripRequests.length > 0) {
        const reqIds = trip.tripRequests.map((tr: any) => tr.requestId);
        await tx.vehicleRequest.updateMany({
          where: { id: { in: reqIds } },
          data: { status: "SUBMITTED" },
        });
      }

      // Release vehicle
      if (trip.vehicleId) {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "AVAILABLE" },
        });
      }

      // Release driver
      if (trip.driverId) {
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: "AVAILABLE" },
        });
      }

      // Delete trip request associations
      await tx.tripRequest.deleteMany({
        where: { tripId },
      });

      // Delete gate passes
      await tx.tripGatePass.deleteMany({
        where: { tripId },
      });

      // Delete reconciliations
      await tx.tripReconciliation.deleteMany({
        where: { tripId },
      });

      // Delete the trip record
      await tx.deliveryTrip.delete({
        where: { id: tripId },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "DELETE_TRIP",
          module: "TRIPS",
          recordId: String(tripId),
          details: `Super Admin deleted Trip #${trip.tripNo}`,
        },
      });
    });

    return NextResponse.json({ success: true, message: `Trip #${trip.tripNo} permanently deleted.` });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to delete trip" }, { status: 500 });
  }
}
