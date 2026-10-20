import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authentication & Authorization check (requires 'reopen_trips' permission or ADMIN / SUPER_ADMIN)
    const auth = await authorizeApi({ action: "reopen_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId || isNaN(tripId)) {
      return NextResponse.json(
        { success: false, message: "Invalid trip ID provided." },
        { status: 400 }
      );
    }

    // 2. Parse request body for mandatory reason
    const body = await request.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason || reason.length < 5) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A valid reason for reopening (minimum 5 characters) is mandatory.",
        },
        { status: 400 }
      );
    }

    // 3. Fetch trip with relations
    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        tripRequests: {
          include: { request: true },
        },
        reconciliations: true,
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) {
      return NextResponse.json(
        { success: false, message: "Delivery Trip not found." },
        { status: 404 }
      );
    }

    // 4. Plant access scoping check for non-admin users
    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      const hasPlantAccess = trip.tripRequests.some(
        (tr: any) => tr.request && canAccessPlant(user, tr.request.plantId)
      );
      if (!hasPlantAccess && trip.tripRequests.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Forbidden: You do not have plant access to this trip.",
          },
          { status: 403 }
        );
      }
    }

    // 5. HARD BLOCK: Reconciled or Closed trips CANNOT be reopened under any circumstance
    const BLOCKED_STATUSES = ["RECONCILED", "FINALIZED", "CLOSED"];
    if (BLOCKED_STATUSES.includes(trip.status)) {
      return NextResponse.json(
        {
          success: false,
          message: `Trip #${trip.tripNo} is in '${trip.status}' status. Reopening is strictly blocked for reconciled, finalized, or closed trips to protect ERP integrity.`,
        },
        { status: 400 }
      );
    }

    // Check if Datatex reconciliation records exist
    if (trip.reconciliations && trip.reconciliations.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Trip #${trip.tripNo} has ${trip.reconciliations.length} active Datatex reconciliation record(s). It cannot be reopened without ERP reconciliation rollback.`,
        },
        { status: 400 }
      );
    }

    // 6. Status check: Only COMPLETED trips can be reopened back to ASSIGNED
    if (trip.status !== "COMPLETED") {
      return NextResponse.json(
        {
          success: false,
          message: `Only COMPLETED trips can be stepped back to ASSIGNED. Current trip status is '${trip.status}'.`,
        },
        { status: 400 }
      );
    }

    // 7. Check Vehicle & Driver availability for warning
    const warnings: string[] = [];
    let canAllocateVehicle = false;
    if (trip.vehicleId && trip.vehicle) {
      if (trip.vehicle.status === "AVAILABLE") {
        canAllocateVehicle = true;
      } else {
        warnings.push(
          `Vehicle (${trip.vehicle.vehicleNumber}) is currently in '${trip.vehicle.status}' status on another task.`
        );
      }
    }

    let canAllocateDriver = false;
    if (trip.driverId && trip.driver) {
      if (trip.driver.status === "AVAILABLE") {
        canAllocateDriver = true;
      } else {
        warnings.push(
          `Driver (${trip.driver.name}) is currently in '${trip.driver.status}' status on another task.`
        );
      }
    }

    const reqIds = trip.tripRequests
      .map((tr: any) => tr.requestId)
      .filter(Boolean);

    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    // 8. Atomic database transaction
    await prisma.$transaction(async (tx: any) => {
      // Step A: Revert trip status to ASSIGNED, clear completion metadata
      await tx.deliveryTrip.update({
        where: { id: tripId },
        data: {
          status: "ASSIGNED",
          completedBy: null,
          completedAt: null,
        },
      });

      // Step B: Revert all linked requests back to ALLOCATED
      if (reqIds.length > 0) {
        await tx.vehicleRequest.updateMany({
          where: { id: { in: reqIds } },
          data: { status: "ALLOCATED" },
        });
      }

      // Step C: Re-assign vehicle if available
      if (canAllocateVehicle && trip.vehicleId) {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: "ALLOCATED" },
        });
      }

      // Step D: Re-assign driver if available
      if (canAllocateDriver && trip.driverId) {
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: "ON_TRIP" },
        });
      }

      // Step E: Mandatory audit logging
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "REOPEN_TRIP",
          module: "TRIPS",
          recordId: String(tripId),
          details: `Trip #${trip.tripNo} reopened to ASSIGNED by ${user.name || user.email} (${user.roleCode}). Reason: "${reason}". ${reqIds.length} request(s) reverted to ALLOCATED.${warnings.length > 0 ? " Fleet Warnings: " + warnings.join(" | ") : ""}`,
          ipAddress: clientIp,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Trip #${trip.tripNo} successfully reopened to ASSIGNED. You can now modify allocations or add additional cargo in Combine Workbench.`,
      warnings: warnings.length > 0 ? warnings : undefined,
      trip: {
        id: trip.id,
        tripNo: trip.tripNo,
        status: "ASSIGNED",
      },
    });
  } catch (error: any) {
    console.error("Error reopening trip:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to reopen delivery trip.",
      },
      { status: 500 }
    );
  }
}
