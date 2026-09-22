import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, can, canAccessPlant } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    if (!isAdmin(user) && !can(user, "dispatch_trips") && !can(user, "allocate_trips")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Dispatcher privileges required to reject requests." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const requestId = parseInt(resolvedParams.id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ success: false, message: "Invalid request ID." }, { status: 400 });
    }

    const body = await req.json();
    const reason = body.reason?.trim() || "Rejected by Fleet Management";

    const request = await prisma.vehicleRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, name: true, email: true, userCode: true },
        },
        tripRequests: {
          include: { trip: true },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, message: "Request not found." }, { status: 404 });
    }

    if (!isAdmin(user) && !canAccessPlant(user, request.plantId)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Plant access restricted." },
        { status: 403 }
      );
    }

    const normalizedStatus = (request.status || "").toUpperCase();
    if (["COMPLETED", "CANCELLED", "REJECTED"].includes(normalizedStatus)) {
      return NextResponse.json(
        { success: false, message: `Cannot reject request in '${normalizedStatus}' status.` },
        { status: 400 }
      );
    }

    const activeTrip = request.tripRequests.find(
      (tr: any) => !["COMPLETED", "CANCELLED"].includes(tr.trip.status)
    );
    if (activeTrip) {
      return NextResponse.json(
        {
          success: false,
          message: `Request is currently allocated to active Trip ${activeTrip.trip.tripNo}. Remove from trip before rejecting.`,
        },
        { status: 400 }
      );
    }

    const updatedRemarks = request.remarks
      ? `${request.remarks} | [REJECTED: ${reason}]`
      : `[REJECTED: ${reason}]`;

    const updatedRequest = await prisma.vehicleRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        remarks: updatedRemarks,
      },
    });

    await ActivityLogger.log(
      "REQUESTS",
      "REJECT_REQUEST",
      request.requestCode,
      `Rejected Request ${request.requestCode} | Reason: ${reason}`,
      user.id
    );

    if (request.requesterId) {
      try {
        await prisma.notification.create({
          data: {
            userId: request.requesterId,
            type: "REQUEST_REJECTED",
            title: `Request Rejected: ${request.requestCode}`,
            message: `Your request ${request.requestCode} was rejected. Reason: ${reason}`,
            linkUrl: `/requests/${request.id}`,
          },
        });
      } catch (notifErr) {
        console.error("Failed to create rejection notification:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Request ${request.requestCode} rejected successfully.`,
      request: updatedRequest,
    });
  } catch (err: any) {
    console.error("Reject request error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Rejection failed." }, { status: 500 });
  }
}
