import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";
import { generateNextTripNo } from "@/lib/sequence";

async function canUserManageTrip(user: any, tripId: number, requireFullOwnership = false): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (!user.plantIds || user.plantIds.length === 0) return false;
  const trip = await prisma.deliveryTrip.findUnique({
    where: { id: tripId },
    include: {
      tripRequests: {
        include: { request: true },
      },
    },
  });
  if (!trip) return true;
  if (trip.tripRequests.length === 0) return true;
  if (requireFullOwnership) {
    // For destructive actions (reverse, discard, complete), user must have plant access to ALL requests in the trip
    return trip.tripRequests.every((tr: any) => !tr.request || canAccessPlant(user, tr.request.plantId));
  }
  return trip.tripRequests.some((tr: any) => tr.request && canAccessPlant(user, tr.request.plantId));
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "allocate_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { action } = body;

    const isDestructive = ["reverse", "discard", "complete"].includes(action);

    // Verify plant scope for any target trip IDs
    if (body.tripId && !(await canUserManageTrip(user, Number(body.tripId), isDestructive))) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Plant access restricted for this trip." },
        { status: 403 }
      );
    }
    if (body.sourceTripId && !(await canUserManageTrip(user, Number(body.sourceTripId), isDestructive))) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Plant access restricted for source trip." },
        { status: 403 }
      );
    }
    if (body.targetTripId && !(await canUserManageTrip(user, Number(body.targetTripId)))) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Plant access restricted for target trip." },
        { status: 403 }
      );
    }

    // If a specific request is targeted (e.g. add, remove, transfer), ensure user has access to that request's plant
    if (body.requestId && !isAdmin(user)) {
      const targetReq = await prisma.vehicleRequest.findUnique({
        where: { id: Number(body.requestId) },
        select: { plantId: true },
      });
      if (targetReq && !canAccessPlant(user, targetReq.plantId)) {
        return NextResponse.json(
          { success: false, message: "Forbidden: You cannot modify requests belonging to other plants." },
          { status: 403 }
        );
      }
    }

    // Verify that dispatched, completed, or in-transit trips cannot be modified, reversed, or have cargo altered
    const modifyingActions = [
      "save-allocation",
      "update-trip",
      "add-request",
      "remove-request",
      "reorder",
      "transfer",
      "reverse",
      "discard",
      "dispatch-to-deck",
    ];

    if (modifyingActions.includes(action)) {
      const checkTripId = body.tripId || body.sourceTripId;
      if (checkTripId) {
        const existingTrip = await prisma.deliveryTrip.findUnique({
          where: { id: Number(checkTripId) },
          select: { id: true, tripNo: true, status: true },
        });

        if (existingTrip) {
          const lockedStatuses = [
            "READY_FOR_LOADING",
            "DISPATCHED",
            "IN_TRANSIT",
            "GATE_PASS_ISSUED",
            "RECONCILED",
            "COMPLETED",
          ];

          if (lockedStatuses.includes(existingTrip.status)) {
            return NextResponse.json(
              {
                success: false,
                message: `Action '${action}' not allowed: Trip #${existingTrip.tripNo} is in '${existingTrip.status}' status and cannot be modified or reversed.`,
              },
              { status: 400 }
            );
          }
        }
      }
    }

    switch (action) {
      case "create-empty": {
        const { vehicleId, driverId, routeId, adminRemarks } = body;
        if (!vehicleId || !driverId) {
          return NextResponse.json({ success: false, message: "Vehicle and driver are required." }, { status: 400 });
        }

        // Verify vehicle is not already in an active trip
        const activeVehTrip = await prisma.deliveryTrip.findFirst({
          where: {
            vehicleId: Number(vehicleId),
            status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
          },
          select: { tripNo: true },
        });
        if (activeVehTrip) {
          return NextResponse.json(
            { success: false, message: `Vehicle is already assigned to active Trip #${activeVehTrip.tripNo}.` },
            { status: 400 }
          );
        }

        // Verify driver is not already in an active trip
        const activeDriverTrip = await prisma.deliveryTrip.findFirst({
          where: {
            driverId: Number(driverId),
            status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
          },
          select: { tripNo: true },
        });
        if (activeDriverTrip) {
          return NextResponse.json(
            { success: false, message: `Driver is already assigned to active Trip #${activeDriverTrip.tripNo}.` },
            { status: 400 }
          );
        }

        let plannedKm = 0;
        if (routeId) {
          const r = await prisma.route.findUnique({ where: { id: Number(routeId) } });
          if (r?.totalDistanceKm) {
            plannedKm = Number(r.totalDistanceKm);
          }
        }

        const { trip, tripNo } = await prisma.$transaction(async (tx: any) => {
          const tripNo = await generateNextTripNo(tx);

          const newTrip = await tx.deliveryTrip.create({
            data: {
              tripNo,
              vehicleId: Number(vehicleId),
              driverId: Number(driverId),
              routeId: routeId ? Number(routeId) : null,
              status: "ASSIGNED",
              adminRemarks: adminRemarks || null,
              plannedKm,
            },
          });

          await tx.vehicle.update({
            where: { id: Number(vehicleId) },
            data: { status: "ALLOCATED" },
          });

          await tx.driver.update({
            where: { id: Number(driverId) },
            data: { status: "ON_TRIP" },
          });

          return { trip: newTrip, tripNo };
        });

        await ActivityLogger.log("ALLOCATION", "COMBINE_CREATE", tripNo, `Created Combine Trip ${tripNo}`, user.id);

        return NextResponse.json({ success: true, trip });
      }

      case "save-allocation": {
        const { tripId, routeId, plannedKm, requestIds, adminRemarks } = body;
        if (!tripId) {
          return NextResponse.json({ success: false, message: "Trip ID is required." }, { status: 400 });
        }

        const validRequestIds: number[] = Array.isArray(requestIds)
          ? requestIds.map(Number).filter((n) => !isNaN(n) && n > 0)
          : [];

        await prisma.$transaction(async (tx: any) => {
          // 1. Update Trip details
          const updateTripData: any = {};
          if (routeId !== undefined) updateTripData.routeId = routeId ? Number(routeId) : null;
          if (plannedKm !== undefined) updateTripData.plannedKm = Number(plannedKm);
          if (adminRemarks !== undefined) updateTripData.adminRemarks = adminRemarks;

          await tx.deliveryTrip.update({
            where: { id: Number(tripId) },
            data: updateTripData,
          });

          // 2. Find currently linked requests to revert removed ones
          const currentTripRequests = await tx.tripRequest.findMany({
            where: { tripId: Number(tripId) },
            select: { requestId: true },
          });
          const currentReqIds = currentTripRequests.map((tr: { requestId: number }) => tr.requestId);

          // Requests to revert back to SUBMITTED
          const removedReqIds = currentReqIds.filter((id: number) => !validRequestIds.includes(id));
          if (removedReqIds.length > 0) {
            await tx.vehicleRequest.updateMany({
              where: { id: { in: removedReqIds } },
              data: { status: "SUBMITTED" },
            });
          }

          // 3. Delete existing trip requests and re-insert in the staged order with loading sequence
          await tx.tripRequest.deleteMany({
            where: { tripId: Number(tripId) },
          });

          if (validRequestIds.length > 0) {
            for (let idx = 0; idx < validRequestIds.length; idx++) {
              await tx.tripRequest.create({
                data: {
                  tripId: Number(tripId),
                  requestId: validRequestIds[idx],
                  loadingSequence: idx + 1,
                },
              });
            }

            // Mark all linked requests as ALLOCATED
            await tx.vehicleRequest.updateMany({
              where: { id: { in: validRequestIds } },
              data: { status: "ALLOCATED" },
            });
          }
        });

        await ActivityLogger.log(
          "ALLOCATION",
          "SAVE_ALLOCATION",
          `TRIP-${tripId}`,
          `Saved allocation for Trip #${tripId}: ${validRequestIds.length} request(s) committed.`,
          user.id
        );

        return NextResponse.json({
          success: true,
          message: "Allocation successfully saved.",
          requestCount: validRequestIds.length,
        });
      }

      case "update-trip": {
        const { tripId, routeId, plannedKm, adminRemarks } = body;
        const updateData: any = {};
        if (routeId !== undefined) updateData.routeId = routeId ? Number(routeId) : null;
        if (plannedKm !== undefined) updateData.plannedKm = Number(plannedKm);
        if (adminRemarks !== undefined) updateData.adminRemarks = adminRemarks;

        const updated = await prisma.deliveryTrip.update({
          where: { id: Number(tripId) },
          data: updateData,
        });

        return NextResponse.json({ success: true, trip: updated });
      }

      case "add-request": {
        const { tripId, requestId } = body;

        await prisma.$transaction(async (tx: any) => {
          const currentCount = await tx.tripRequest.count({ where: { tripId: Number(tripId) } });

          await tx.tripRequest.create({
            data: {
              tripId: Number(tripId),
              requestId: Number(requestId),
              loadingSequence: currentCount + 1,
            },
          });

          await tx.vehicleRequest.update({
            where: { id: Number(requestId) },
            data: { status: "ALLOCATED" },
          });
        });

        return NextResponse.json({ success: true });
      }

      case "remove-request": {
        const { tripId, requestId } = body;

        await prisma.$transaction(async (tx: any) => {
          await tx.tripRequest.delete({
            where: {
              tripId_requestId: {
                tripId: Number(tripId),
                requestId: Number(requestId),
              },
            },
          });

          await tx.vehicleRequest.update({
            where: { id: Number(requestId) },
            data: { status: "SUBMITTED" },
          });
        });

        return NextResponse.json({ success: true });
      }

      case "reorder": {
        const { tripId, orderedRequestIds } = body;
        if (!Array.isArray(orderedRequestIds)) {
          return NextResponse.json({ success: false, message: "Invalid order." }, { status: 400 });
        }

        await prisma.$transaction(async (tx: any) => {
          for (let idx = 0; idx < orderedRequestIds.length; idx++) {
            const reqId = orderedRequestIds[idx];
            await tx.tripRequest.update({
              where: {
                tripId_requestId: {
                  tripId: Number(tripId),
                  requestId: Number(reqId),
                },
              },
              data: { loadingSequence: idx + 1 },
            });
          }
        });

        return NextResponse.json({ success: true, message: "Loading sequence saved." });
      }

      case "transfer": {
        const { sourceTripId, targetTripId, requestId } = body;

        await prisma.$transaction(async (tx: any) => {
          await tx.tripRequest.delete({
            where: {
              tripId_requestId: {
                tripId: Number(sourceTripId),
                requestId: Number(requestId),
              },
            },
          });

          const targetCount = await tx.tripRequest.count({ where: { tripId: Number(targetTripId) } });
          await tx.tripRequest.create({
            data: {
              tripId: Number(targetTripId),
              requestId: Number(requestId),
              loadingSequence: targetCount + 1,
            },
          });
        });

        return NextResponse.json({ success: true });
      }

      case "dispatch-to-deck": {
        const { tripId } = body;
        const trip = await prisma.deliveryTrip.findUnique({
          where: { id: Number(tripId) },
          include: { tripRequests: true },
        });

        if (!trip) {
          return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
        }

        const reqIds = trip.tripRequests.map((tr: any) => tr.requestId);

        await prisma.$transaction(async (tx: any) => {
          await tx.deliveryTrip.update({
            where: { id: Number(tripId) },
            data: { status: "READY_FOR_LOADING" },
          });

          if (reqIds.length > 0) {
            await tx.vehicleRequest.updateMany({
              where: { id: { in: reqIds } },
              data: { status: "ALLOCATED" },
            });
          }
        });

        await ActivityLogger.log("DISPATCH", "DISPATCH_DECK", `TRIP-${tripId}`, `Queued trip #${trip.tripNo} to Loading Deck (READY_FOR_LOADING)`, user.id);
        return NextResponse.json({ success: true, message: "Trip queued for loading bay dispatch." });
      }

      case "reverse":
      case "discard": {
        const { tripId } = body;
        const trip = await prisma.deliveryTrip.findUnique({
          where: { id: Number(tripId) },
          include: { tripRequests: true },
        });

        if (!trip) {
          return NextResponse.json({ error: "Trip not found" }, { status: 404 });
        }

        if (trip.status === "COMPLETED") {
          return NextResponse.json(
            { error: "Action Not Allowed: A Completed trip cannot be reversed." },
            { status: 400 }
          );
        }

        const reqIds = trip.tripRequests.map((tr: { requestId: number }) => tr.requestId);

        await prisma.$transaction(async (tx: any) => {
          // Revert all linked requests back to SUBMITTED
          if (reqIds.length > 0) {
            await tx.vehicleRequest.updateMany({
              where: { id: { in: reqIds } },
              data: { status: "SUBMITTED" },
            });
          }

          // Delete associated gate passes, reconciliations, and trip requests
          await tx.tripGatePass.deleteMany({
            where: { tripId: Number(tripId) },
          });
          await tx.tripReconciliation.deleteMany({
            where: { tripId: Number(tripId) },
          });
          await tx.tripRequest.deleteMany({
            where: { tripId: Number(tripId) },
          });

          // Release vehicle if no other active trip
          if (trip.vehicleId) {
            const otherActiveVehTrips = await tx.deliveryTrip.count({
              where: {
                vehicleId: trip.vehicleId,
                id: { not: Number(tripId) },
                status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
              },
            });
            if (otherActiveVehTrips === 0) {
              await tx.vehicle.update({
                where: { id: trip.vehicleId },
                data: { status: "AVAILABLE" },
              });
            }
          }

          // Release driver if no other active trip
          if (trip.driverId) {
            const otherActiveDriverTrips = await tx.deliveryTrip.count({
              where: {
                driverId: trip.driverId,
                id: { not: Number(tripId) },
                status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
              },
            });
            if (otherActiveDriverTrips === 0) {
              await tx.driver.update({
                where: { id: trip.driverId },
                data: { status: "AVAILABLE" },
              });
            }
          }

          // Delete the trip
          await tx.deliveryTrip.delete({
            where: { id: Number(tripId) },
          });
        });

        await ActivityLogger.log(
          "ALLOCATION",
          "DISCARD_TRIP",
          trip.tripNo,
          `Discarded/Reversed Trip #${trip.id} and reverted ${reqIds.length} request(s) back to SUBMITTED status`,
          user.id
        );

        return NextResponse.json({ success: true, message: "Trip reversed successfully" });
      }

      case "complete": {
        const { tripId } = body;
        if (!tripId) {
          return NextResponse.json({ success: false, message: "Trip ID is required." }, { status: 400 });
        }

        const trip = await prisma.deliveryTrip.findUnique({
          where: { id: Number(tripId) },
          include: { tripRequests: true },
        });

        if (!trip) {
          return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
        }

        const reqIds = trip.tripRequests.map((tr: { requestId: number }) => tr.requestId);

        await prisma.$transaction(async (tx: any) => {
          await tx.deliveryTrip.update({
            where: { id: Number(tripId) },
            data: {
              status: "COMPLETED",
              completedBy: user.id,
              completedAt: new Date(),
            },
          });

          // Mark all linked requests COMPLETED
          if (reqIds.length > 0) {
            await tx.vehicleRequest.updateMany({
              where: { id: { in: reqIds } },
              data: { status: "COMPLETED" },
            });
          }

          // Release vehicle & driver
          if (trip.vehicleId) {
            await tx.vehicle.update({
              where: { id: trip.vehicleId },
              data: { status: "AVAILABLE" },
            });
          }
          if (trip.driverId) {
            await tx.driver.update({
              where: { id: trip.driverId },
              data: { status: "AVAILABLE" },
            });
          }
        });

        await ActivityLogger.log("TRIPS", "COMPLETE_TRIP", trip.tripNo, `Marked trip ${trip.tripNo} as COMPLETED`, user.id);

        return NextResponse.json({ success: true, message: `Trip ${trip.tripNo} completed successfully.` });
      }

      default:
        return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
    }
  } catch (err: any) {
    console.error("Combine allocation error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Operation failed." }, { status: 500 });
  }
}
