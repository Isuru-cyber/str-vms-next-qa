import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "dispatch_trips" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { action, tripId } = body;

    if (!tripId) {
      return NextResponse.json({ success: false, message: "Trip ID is required." }, { status: 400 });
    }

    const tripIdNum = Number(tripId);

    // Verify plant scope for non-admins
    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      const existingTrip = await prisma.deliveryTrip.findUnique({
        where: { id: tripIdNum },
        include: { tripRequests: { include: { request: true } } },
      });
      if (!existingTrip) {
        return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
      }
      const hasPlantAccess = existingTrip.tripRequests.some(
        (tr: any) => tr.request && canAccessPlant(user, tr.request.plantId)
      );
      if (!hasPlantAccess && existingTrip.tripRequests.length > 0) {
        return NextResponse.json({ success: false, message: "Forbidden: Plant access restricted." }, { status: 403 });
      }
    }

    if (action === "save-gate-passes") {
      const { gatePasses } = body; // Array<{ requestId?: number, gatePassNo: string | string[], remarks?: string }>
      if (!Array.isArray(gatePasses) || gatePasses.length === 0) {
        return NextResponse.json({ success: false, message: "No gate pass numbers provided." }, { status: 400 });
      }

      const trip = await prisma.$transaction(async (tx: any) => {
        for (const gp of gatePasses) {
          if (!gp.gatePassNo) continue;
          const rawEntries = Array.isArray(gp.gatePassNo)
            ? gp.gatePassNo
            : String(gp.gatePassNo).split(/[\r\n,]+/);

          for (const rawNo of rawEntries) {
            const cleanNo = String(rawNo).trim();
            if (!cleanNo) continue;

            await tx.tripGatePass.create({
              data: {
                tripId: tripIdNum,
                requestId: gp.requestId ? Number(gp.requestId) : null,
                gatePassNo: cleanNo,
                remarks: gp.remarks || null,
                enteredBy: user.id,
                status: "ENTERED",
              },
            });
          }
        }

        // Update delivery trip status to DISPATCHED
        const updatedTrip = await tx.deliveryTrip.update({
          where: { id: tripIdNum },
          data: { status: "DISPATCHED" },
          include: { tripRequests: true },
        });

        // Ensure all linked requests are in DISPATCHED status
        if (updatedTrip.tripRequests.length > 0) {
          const reqIds = updatedTrip.tripRequests.map((tr: any) => tr.requestId);
          await tx.vehicleRequest.updateMany({
            where: { id: { in: reqIds } },
            data: { status: "DISPATCHED" },
          });
        }

        return updatedTrip;
      });

      await ActivityLogger.log("DISPATCH", "GATE_PASS", `TRIP-${tripId}`, `Recorded gate passes for Trip #${tripId} (${trip.tripNo})`, user.id);
      return NextResponse.json({ success: true, message: "Gate passes saved successfully." });
    }

    if (action === "mark-departed") {
      const gatePassCount = await prisma.tripGatePass.count({
        where: { tripId: tripIdNum },
      });

      if (gatePassCount === 0) {
        return NextResponse.json(
          { success: false, message: "Action Blocked: Gate pass numbers must be issued and saved before marking a trip as departed." },
          { status: 400 }
        );
      }

      const trip = await prisma.$transaction(async (tx: any) => {
        const updatedTrip = await tx.deliveryTrip.update({
          where: { id: tripIdNum },
          data: {
            status: "DISPATCHED",
            actualStart: new Date(),
          },
        });

        if (updatedTrip.driverId) {
          await tx.driver.update({
            where: { id: updatedTrip.driverId },
            data: { status: "ON_TRIP" },
          });
        }

        if (updatedTrip.vehicleId) {
          await tx.vehicle.update({
            where: { id: updatedTrip.vehicleId },
            data: { status: "IN_USE" },
          });
        }

        return updatedTrip;
      });

      await ActivityLogger.log("DISPATCH", "DEPARTURE", `TRIP-${tripId}`, `Marked trip #${tripId} as departed/dispatched`, user.id);
      return NextResponse.json({ success: true, message: "Trip cleared and marked departed." });
    }

    return NextResponse.json({ success: false, message: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("Dispatch API error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Operation failed." }, { status: 500 });
  }
}
