import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi({ anyAction: ["view_trips", "allocate_trips", "edit_requests"] });
    if (auth.error) return auth.error;
    const user = auth.user;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId || isNaN(tripId)) {
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

    // Plant access check
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

    const body = await request.json();
    const { deliveryWindow, planningType, requestedByDept, adminRemarks } = body;

    const updateData: any = {};
    if (deliveryWindow !== undefined) updateData.deliveryWindow = deliveryWindow || null;
    if (planningType !== undefined) updateData.planningType = planningType || "Planned";
    if (requestedByDept !== undefined) updateData.requestedByDept = requestedByDept || null;
    if (adminRemarks !== undefined) updateData.adminRemarks = adminRemarks || null;

    const updated = await prisma.deliveryTrip.update({
      where: { id: tripId },
      data: updateData,
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_TRIP_CLASSIFICATION",
        module: "TRIPS",
        recordId: String(tripId),
        details: `Trip #${trip.tripNo} classification updated: Window=${updateData.deliveryWindow || "N/A"}, Planning=${updateData.planningType || "Planned"}, Dept=${updateData.requestedByDept || "N/A"}.`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Trip #${trip.tripNo} updated successfully.`,
      trip: updated,
    });
  } catch (error: any) {
    console.error("Error updating trip classification:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update trip." },
      { status: 500 }
    );
  }
}
