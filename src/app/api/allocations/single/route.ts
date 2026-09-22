import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { isAdmin, canAccessPlant } from "@/lib/permission-utils";
import { ActivityLogger } from "@/lib/logger";
import { generateNextTripNo } from "@/lib/sequence";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "allocate_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const { requestId, requestIds, vehicleId, driverId, routeId, plannedKm, adminRemarks } = await req.json();

    const targetRequestIds: number[] = Array.isArray(requestIds) && requestIds.length > 0
      ? requestIds.map(Number).filter((n) => !isNaN(n) && n > 0)
      : requestId
      ? [Number(requestId)]
      : [];

    if (targetRequestIds.length === 0 || !vehicleId || !driverId || !routeId) {
      return NextResponse.json({ success: false, message: "Request, vehicle, driver, and route are required." }, { status: 400 });
    }

    // Verify ownership and allocatable status of target requests
    const existingRequests = await prisma.vehicleRequest.findMany({
      where: { id: { in: targetRequestIds } },
      select: { id: true, plantId: true, status: true, requestCode: true },
    });

    if (existingRequests.length !== targetRequestIds.length) {
      return NextResponse.json({ success: false, message: "One or more requests could not be found." }, { status: 404 });
    }

    for (const r of existingRequests) {
      if (!isAdmin(user) && !canAccessPlant(user, r.plantId)) {
        return NextResponse.json(
          { success: false, message: `Unauthorized: You do not have access to plant for request ${r.requestCode}` },
          { status: 403 }
        );
      }
      if (r.status !== "SUBMITTED" && r.status !== "PENDING") {
        return NextResponse.json(
          { success: false, message: `Request ${r.requestCode} is in '${r.status}' state and cannot be allocated.` },
          { status: 400 }
        );
      }
    }

    // Execute all mutations atomically in a single transaction
    const trip = await prisma.$transaction(async (tx: any) => {
      // Check vehicle and driver availability to prevent double-allocation
      const targetVeh = await tx.vehicle.findUnique({
        where: { id: Number(vehicleId) },
        select: { id: true, status: true, vehicleNumber: true },
      });
      if (!targetVeh || targetVeh.status !== "AVAILABLE") {
        throw new Error(`Vehicle ${targetVeh?.vehicleNumber || vehicleId} is not available (current status: '${targetVeh?.status || "UNKNOWN"}').`);
      }

      const targetDriver = await tx.driver.findUnique({
        where: { id: Number(driverId) },
        select: { id: true, status: true, name: true },
      });
      if (!targetDriver || targetDriver.status !== "AVAILABLE") {
        throw new Error(`Driver ${targetDriver?.name || driverId} is not available (current status: '${targetDriver?.status || "UNKNOWN"}').`);
      }

      const tripNo = await generateNextTripNo(tx);

      const newTrip = await tx.deliveryTrip.create({
        data: {
          tripNo,
          vehicleId: Number(vehicleId),
          driverId: Number(driverId),
          routeId: Number(routeId),
          plannedKm: plannedKm ? Number(plannedKm) : 0,
          status: "ASSIGNED",
          adminRemarks: adminRemarks || null,
          tripRequests: {
            create: targetRequestIds.map((id, index) => ({
              requestId: id,
              loadingSequence: index + 1,
            })),
          },
        },
        include: {
          vehicle: true,
          driver: true,
        },
      });

      // Update Requests status to ALLOCATED
      await tx.vehicleRequest.updateMany({
        where: { id: { in: targetRequestIds } },
        data: { status: "ALLOCATED" },
      });

      // Update Vehicle & Driver Status
      await tx.vehicle.update({
        where: { id: Number(vehicleId) },
        data: { status: "ALLOCATED" },
      });

      await tx.driver.update({
        where: { id: Number(driverId) },
        data: { status: "ON_TRIP" },
      });

      return newTrip;
    });

    await ActivityLogger.log(
      "ALLOCATION",
      targetRequestIds.length > 1 ? "COMBINE_ALLOCATE" : "SINGLE_ALLOCATE",
      trip.tripNo,
      `Allocated Request(s) [${targetRequestIds.join(", ")}] to Trip ${trip.tripNo} | Vehicle: ${trip.vehicle.vehicleNumber} | Driver: ${trip.driver.name}`,
      user.id
    );

    return NextResponse.json({ success: true, trip });
  } catch (err: any) {
    console.error("Single allocation error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to allocate request." }, { status: 500 });
  }
}
