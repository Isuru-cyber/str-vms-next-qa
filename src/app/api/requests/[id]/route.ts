import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, can, canAccessPlant } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ message: "Invalid request ID" }, { status: 400 });
    }

    const data = await prisma.vehicleRequest.findUnique({
      where: { id: requestId },
      include: {
        plant: true,
        operation: true,
        subOperation: true,
        fromLocation: true,
        toLocation: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            userCode: true,
          },
        },
        tripRequests: {
          include: {
            trip: {
              include: {
                vehicle: true,
                driver: true,
                route: true,
              },
            },
          },
        },
      },
    });

    if (!data) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    if (!isAdmin(user)) {
      if (!can(user, "dispatch_trips") && data.requesterId !== user.id) {
        return NextResponse.json({ message: "Forbidden: You do not have permission to view this request." }, { status: 403 });
      }
      if (user.plantIds && user.plantIds.length > 0 && !canAccessPlant(user, data.plantId)) {
        return NextResponse.json({ message: "Forbidden: Plant access restricted." }, { status: 403 });
      }
    }

    return NextResponse.json({ status: "success", data });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch request" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ message: "Invalid request ID" }, { status: 400 });
    }

    const existing = await prisma.vehicleRequest.findUnique({
      where: { id: requestId },
      include: {
        tripRequests: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    if (!isAdmin(user)) {
      if (!can(user, "dispatch_trips") && existing.requesterId !== user.id) {
        return NextResponse.json({ message: "Forbidden: You cannot modify requests created by other users." }, { status: 403 });
      }
      if (user.plantIds && user.plantIds.length > 0 && !canAccessPlant(user, existing.plantId)) {
        return NextResponse.json({ message: "Forbidden: Plant access restricted." }, { status: 403 });
      }
    }

    const lockedRequestStatuses = [
      "DISPATCHED",
      "READY_FOR_LOADING",
      "GATE_PASS_ISSUED",
      "IN_TRANSIT",
      "COMPLETED",
      "FINALIZED",
      "CLOSED",
      "CANCELLED",
      "REJECTED",
    ];

    if (lockedRequestStatuses.includes(existing.status.toUpperCase())) {
      return NextResponse.json(
        { message: `Cannot modify request: This request is in '${existing.status}' status and cannot be edited.` },
        { status: 400 }
      );
    }

    const isAllocated = existing.tripRequests.some(
      (tr: any) => tr.trip && tr.trip.status !== "CANCELLED"
    );

    const body = await request.json();
    const {
      fromLocationId,
      toLocationId,
      requiredDate,
      requiredTime,
      urgency,
      requiredKg,
      requiredCbm,
      boxCount,
      goodsReadyStatus,
      invoiceNumbers,
      itemDescription,
      remarks,
    } = body;

    const updateData: any = {
      requiredKg: requiredKg !== undefined ? parseFloat(requiredKg) || 0 : existing.requiredKg,
      requiredCbm: requiredCbm !== undefined ? parseFloat(requiredCbm) || 0 : existing.requiredCbm,
      boxCount: boxCount !== undefined ? parseInt(boxCount, 10) || 0 : existing.boxCount,
      goodsReadyStatus: goodsReadyStatus ?? existing.goodsReadyStatus,
      invoiceNumbers: invoiceNumbers !== undefined ? invoiceNumbers : existing.invoiceNumbers,
      itemDescription: itemDescription !== undefined ? itemDescription : existing.itemDescription,
      remarks: remarks !== undefined ? remarks : existing.remarks,
    };

    if (!isAllocated) {
      if (fromLocationId) updateData.fromLocationId = parseInt(fromLocationId, 10);
      if (toLocationId) updateData.toLocationId = parseInt(toLocationId, 10);
      if (urgency) updateData.urgency = urgency;

      if (requiredDate) {
        const todayStr = new Date().toISOString().split("T")[0];
        const reqDateStr = new Date(requiredDate).toISOString().split("T")[0];

        if (reqDateStr < todayStr) {
          return NextResponse.json(
            { message: "Back-dates are not allowed. Please select today or a future date." },
            { status: 400 }
          );
        }

        if (requiredTime) {
          const [hourStr, minStr] = String(requiredTime).split(":");
          const targetHour = parseInt(hourStr, 10);
          const targetMin = parseInt(minStr || "0", 10);

          if (isNaN(targetHour) || isNaN(targetMin) || targetHour < 6 || targetHour > 20 || (targetHour === 20 && targetMin > 0)) {
            return NextResponse.json(
              { message: "Validation Error: Target time must be between 06:00 AM and 08:00 PM." },
              { status: 400 }
            );
          }

          if (reqDateStr === todayStr) {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const targetMinutes = targetHour * 60 + targetMin;

            if (targetMinutes < currentMinutes + 60) {
              return NextResponse.json(
                { message: "Validation Error: Target Time must be at least 1 hour ahead of current time for same-day requests." },
                { status: 400 }
              );
            }
          }
        }

        updateData.requiredDate = new Date(requiredDate);
      }

      if (requiredTime) {
        updateData.requiredTime = requiredTime;
      }
    }

    const updated = await prisma.vehicleRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_REQUEST",
          module: "REQUESTS",
          recordId: requestId,
          oldValue: JSON.stringify({
            requiredKg: existing.requiredKg,
            requiredCbm: existing.requiredCbm,
            boxCount: existing.boxCount,
            invoiceNumbers: existing.invoiceNumbers,
            status: existing.status,
          }),
          newValue: JSON.stringify(updateData),
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: `Updated vehicle request ${existing.requestCode}`,
          module: "REQUESTS",
          recordId: String(requestId),
        },
      });
    } catch (logErr) {
      console.error("Failed to write audit logs:", logErr);
    }

    return NextResponse.json({
      status: "success",
      message: "Request updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update request" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    const { id } = await params;
    const requestId = parseInt(id, 10);
    if (isNaN(requestId)) {
      return NextResponse.json({ message: "Invalid request ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason?.trim() || "Deleted by user";

    const existing = await prisma.vehicleRequest.findUnique({
      where: { id: requestId },
      include: {
        tripRequests: {
          include: {
            trip: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 });
    }

    if (!isAdmin(user)) {
      if (!can(user, "dispatch_trips") && existing.requesterId !== user.id) {
        return NextResponse.json({ message: "Forbidden: You cannot cancel requests created by other users." }, { status: 403 });
      }
      if (user.plantIds && user.plantIds.length > 0 && !canAccessPlant(user, existing.plantId)) {
        return NextResponse.json({ message: "Forbidden: Plant access restricted." }, { status: 403 });
      }
    }

    const hasActiveTrip = existing.tripRequests.some(
      (tr: any) => tr.trip && tr.trip.status !== "CANCELLED"
    );

    if (hasActiveTrip) {
      return NextResponse.json(
        { message: "Cannot delete request because it is already allocated to an active trip." },
        { status: 400 }
      );
    }

    const allowedStatuses = ["SUBMITTED", "UNDER REVIEW", "DRAFT"];
    if (!allowedStatuses.includes(existing.status.toUpperCase())) {
      return NextResponse.json(
        { message: `Cannot delete request with status '${existing.status}'.` },
        { status: 400 }
      );
    }

    const updatedRemarks = existing.remarks
      ? `${existing.remarks}\n[CANCELLED by ${user.name} (${user.email}) on ${new Date().toISOString()}: ${reason}]`
      : `[CANCELLED by ${user.name} (${user.email}) on ${new Date().toISOString()}: ${reason}]`;

    const updated = await prisma.vehicleRequest.update({
      where: { id: requestId },
      data: {
        status: "CANCELLED",
        remarks: updatedRemarks,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "DELETE_REQUEST",
          module: "REQUESTS",
          recordId: requestId,
          oldValue: JSON.stringify({ status: existing.status }),
          newValue: JSON.stringify({ status: "CANCELLED", reason }),
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: `Cancelled/deleted request ${existing.requestCode}`,
          module: "REQUESTS",
          recordId: String(requestId),
          details: `Reason: ${reason}`,
        },
      });

      await prisma.notification.create({
        data: {
          roleTarget: "LOGISTICS_OFFICER",
          type: "REQUEST_CANCELLED",
          title: `Request Cancelled: ${existing.requestCode}`,
          message: `Request ${existing.requestCode} was cancelled by ${user.name}. Reason: ${reason}`,
          linkUrl: `/requests/${requestId}`,
        },
      });
    } catch (logErr) {
      console.error("Failed to write audit logs or notification:", logErr);
    }

    return NextResponse.json({
      status: "success",
      message: "Request deleted successfully",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to delete request" },
      { status: 500 }
    );
  }
}
