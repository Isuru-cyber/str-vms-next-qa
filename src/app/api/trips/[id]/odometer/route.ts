import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, canAccessPlant } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";
import { CostCalculator } from "@/lib/cost-calculator";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorizeApi({ action: "enter_odometer" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const resolvedParams = await params;
    const tripId = parseInt(resolvedParams.id, 10);
    if (!tripId || isNaN(tripId) || tripId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid trip ID." }, { status: 400 });
    }

    const body = await request.json();
    const { actualKm, varianceReason } = body;

    const parsedActualKm = parseFloat(String(actualKm));
    if (isNaN(parsedActualKm) || parsedActualKm < 0) {
      return NextResponse.json(
        { success: false, message: "Valid actual KM (positive number) is required." },
        { status: 400 }
      );
    }

    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        tripRequests: {
          include: { request: true },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, message: "Trip not found." }, { status: 404 });
    }

    // Plant access check for non-admin
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

    const plannedKmNum = Number(trip.plannedKm) || 0;
    const varianceKmNum = parsedActualKm - plannedKmNum;

    // Recalculate trip costs based on actual KM (only for contracted fleet, NOT for flat ad-hoc hires)
    let updatedCostBreakdown: any = null;
    if (trip.vehicle && trip.paymentBasis !== "ADHOC" && trip.vehicle.ownershipType !== "ADHOC") {
      const dieselRate = Number(trip.dieselRateApplied) || 382.0;
      updatedCostBreakdown = CostCalculator.calculateTripCost(
        parsedActualKm,
        trip.vehicle,
        dieselRate
      );
    }

    const updateData: any = {
      actualKm: parsedActualKm,
      varianceKm: varianceKmNum,
      varianceReason: varianceReason ? String(varianceReason).trim() : null,
    };

    if (updatedCostBreakdown) {
      updateData.actualCost = updatedCostBreakdown.total_trip_cost;
      updateData.fuelCost = updatedCostBreakdown.fuel_cost;
      updateData.runningCost = updatedCostBreakdown.running_cost;
      updateData.driverProfit = updatedCostBreakdown.driver_profit;
      updateData.totalTripCost = updatedCostBreakdown.total_trip_cost;
    } else if (trip.paymentBasis === "ADHOC") {
      updateData.actualCost = trip.totalTripCost ?? trip.actualCost;
    }

    const updatedTrip = await prisma.deliveryTrip.update({
      where: { id: tripId },
      data: updateData,
    });

    await ActivityLogger.log(
      "TRIPS",
      "ENTER_ODOMETER",
      trip.tripNo,
      `Updated Actual KM for Trip #${trip.tripNo}: ${parsedActualKm} km (Planned: ${plannedKmNum} km, Variance: ${varianceKmNum >= 0 ? "+" : ""}${varianceKmNum.toFixed(1)} km)${varianceReason ? ` - Reason: ${varianceReason}` : ""}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Actual distance for Trip #${trip.tripNo} updated successfully.`,
      trip: {
        id: updatedTrip.id,
        tripNo: updatedTrip.tripNo,
        actualKm: Number(updatedTrip.actualKm),
        varianceKm: Number(updatedTrip.varianceKm),
        varianceReason: updatedTrip.varianceReason,
        actualCost: Number(updatedTrip.actualCost),
      },
    });
  } catch (err: any) {
    console.error("Error updating actual KM:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Failed to update actual KM." },
      { status: 500 }
    );
  }
}
