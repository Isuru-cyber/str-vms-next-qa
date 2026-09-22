import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
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

    // Execute all mutations atomically in a single transaction
    const trip = await prisma.$transaction(async (tx: any) => {
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
