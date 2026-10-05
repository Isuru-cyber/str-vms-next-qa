import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant, can } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi({ action: "view_trips" });
    if (auth.error) return auth.error;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId || isNaN(tripId) || tripId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid trip ID." }, { status: 400 });
    }

    const gatePasses = await prisma.tripGatePass.findMany({
      where: { tripId },
      orderBy: { id: "asc" },
      include: {
        enteredUser: {
          select: { id: true, name: true, userCode: true },
        },
      },
    });

    return NextResponse.json({ success: true, gatePasses });
  } catch (error: any) {
    console.error("Failed to fetch trip gate passes:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch gate passes." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    const canManageGP =
      isAdmin(user) ||
      can(user, "issue_gate_pass") ||
      can(user, "dispatch_trips") ||
      can(user, "dispatch_audit");

    if (!canManageGP) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not have permission to manage gate passes." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId || isNaN(tripId) || tripId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid trip ID." }, { status: 400 });
    }

    const body = await request.json();
    const { gatePassNos } = body;

    if (!Array.isArray(gatePassNos)) {
      return NextResponse.json(
        { success: false, message: "Invalid payload: gatePassNos must be an array." },
        { status: 400 }
      );
    }

    // Sanitize and deduplicate incoming gate pass numbers
    const cleanGatePassNos = Array.from(
      new Set(
        gatePassNos
          .map((gp: any) => String(gp || "").trim().toUpperCase())
          .filter(Boolean)
      )
    );

    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        tripRequests: {
          include: { request: true },
        },
        gatePasses: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
    }

    // Plant access validation for non-admins
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

    // Check for duplicate gate passes currently assigned to other active delivery trips
    if (cleanGatePassNos.length > 0) {
      const conflictingGps = await prisma.tripGatePass.findMany({
        where: {
          gatePassNo: { in: cleanGatePassNos },
          tripId: { not: tripId },
          trip: {
            status: { notIn: ["CANCELLED"] },
          },
        },
        include: {
          trip: {
            select: { id: true, tripNo: true, status: true },
          },
        },
      });

      if (conflictingGps.length > 0) {
        const conflictDetails = conflictingGps
          .map((c: any) => `${c.gatePassNo} (in Trip #${c.trip?.tripNo || c.tripId})`)
          .join(", ");
        return NextResponse.json(
          {
            success: false,
            message: `The following Gate Pass number(s) are already assigned to other active trips: ${conflictDetails}.`,
          },
          { status: 409 }
        );
      }
    }

    // Atomic transaction: replace gate passes and optionally advance status if un-dispatched
    const updatedGatePasses = await prisma.$transaction(async (tx: any) => {
      // 1. Remove existing gate passes for this trip
      await tx.tripGatePass.deleteMany({
        where: { tripId },
      });

      // 2. Insert new gate passes
      if (cleanGatePassNos.length > 0) {
        await tx.tripGatePass.createMany({
          data: cleanGatePassNos.map((gpNo) => ({
            tripId,
            gatePassNo: gpNo,
            status: "ENTERED",
            enteredBy: user.id,
          })),
        });
      }

      // 3. If trip is in ASSIGNED or ALLOCATED status and GP is added, transition to GATE_PASS_ISSUED
      if (
        cleanGatePassNos.length > 0 &&
        ["ASSIGNED", "ALLOCATED"].includes(trip.status)
      ) {
        await tx.deliveryTrip.update({
          where: { id: tripId },
          data: { status: "GATE_PASS_ISSUED" },
        });
      }

      return await tx.tripGatePass.findMany({
        where: { tripId },
        orderBy: { id: "asc" },
      });
    });

    await ActivityLogger.log(
      "TRIPS",
      "SAVE_GATE_PASSES",
      trip.tripNo,
      `Recorded ${cleanGatePassNos.length} Gate Pass(es) for Trip #${trip.tripNo}: ${cleanGatePassNos.join(", ") || "None"}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message:
        cleanGatePassNos.length > 0
          ? `${cleanGatePassNos.length} Gate Pass(es) successfully saved for Trip #${trip.tripNo}.`
          : "Gate pass numbers cleared.",
      gatePasses: updatedGatePasses,
    });
  } catch (error: any) {
    console.error("Failed to save gate passes:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to save gate passes." },
      { status: 500 }
    );
  }
}
