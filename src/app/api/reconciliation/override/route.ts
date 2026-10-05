import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, isAdmin, can, canAccessPlant } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const user = auth.user;

    const canReconcile =
      isAdmin(user) ||
      can(user, "dispatch_audit") ||
      can(user, "finalize_reconciliation");

    if (!canReconcile) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Auditor or administrator access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      tripId,
      invoiceNo,
      gatePassNo,
      actualVehicle,
      actualBoxes,
      actualKg,
      actualCbm,
      auditorVerification,
      overrideReason,
      varianceRemarks,
    } = body;

    const tripIdNum = Number(tripId);
    if (!tripIdNum || isNaN(tripIdNum) || tripIdNum <= 0) {
      return NextResponse.json({ success: false, message: "Valid Trip ID is required." }, { status: 400 });
    }

    const remarksText = String(varianceRemarks || overrideReason || "").trim();
    if (!remarksText) {
      return NextResponse.json(
        {
          success: false,
          message: "Auditor Verification remarks / Variance Reason is required.",
        },
        { status: 400 }
      );
    }

    // Verify trip exists and plant access
    const trip = await prisma.deliveryTrip.findUnique({
      where: { id: tripIdNum },
      include: {
        tripRequests: {
          include: { request: true },
        },
        gatePasses: true,
      },
    });

    if (!trip) {
      return NextResponse.json({ success: false, message: "Delivery trip not found." }, { status: 404 });
    }

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

    const cleanInvoiceNo = invoiceNo ? String(invoiceNo).trim().toUpperCase() : "";
    let cleanGatePassNo = gatePassNo ? String(gatePassNo).trim().toUpperCase() : "";

    // If gatePassNo not provided in payload, look up from trip's existing gate passes
    if (!cleanGatePassNo && trip.gatePasses.length > 0) {
      cleanGatePassNo = trip.gatePasses[0].gatePassNo;
    }

    if (!cleanGatePassNo && !cleanInvoiceNo) {
      cleanGatePassNo = `GP-${trip.tripNo}`;
    }

    // Determine match status based on auditor verification
    let computedMatchStatus = "MANUAL_OVERRIDE";
    if (auditorVerification === "VERIFIED") {
      computedMatchStatus = "MATCHED";
    } else if (auditorVerification === "DISCREPANCY_FLAGGED" || auditorVerification === "VARIANCE") {
      computedMatchStatus = "VARIANCE";
    }

    await prisma.$transaction(async (tx: any) => {
      // Find existing reconciliation using specific clauses
      const whereConditions: any[] = [];
      if (cleanGatePassNo) whereConditions.push({ gatePassNo: cleanGatePassNo });
      if (cleanInvoiceNo) whereConditions.push({ invoiceNumbers: cleanInvoiceNo });

      const existingRec = await tx.tripReconciliation.findFirst({
        where: {
          tripId: tripIdNum,
          OR: whereConditions.length > 0 ? whereConditions : undefined,
        },
      });

      const recData = {
        tripId: tripIdNum,
        gatePassNo: cleanGatePassNo || (existingRec?.gatePassNo ?? "N/A"),
        invoiceNumbers: cleanInvoiceNo || (existingRec?.invoiceNumbers ?? cleanGatePassNo),
        actualVehicleNo: actualVehicle || trip.vehicleId ? undefined : null,
        actualBoxes: actualBoxes !== undefined && actualBoxes !== null ? Number(actualBoxes) : (existingRec?.actualBoxes ?? 0),
        actualKg: actualKg !== undefined && actualKg !== null ? Number(actualKg) : (existingRec?.actualKg ?? 0),
        actualCbm: actualCbm !== undefined && actualCbm !== null ? Number(actualCbm) : (existingRec?.actualCbm ?? 0),
        matchStatus: computedMatchStatus,
        varianceRemarks: remarksText,
        reconciledBy: user.id,
        reconciledAt: new Date(),
      };

      if (existingRec) {
        await tx.tripReconciliation.update({
          where: { id: existingRec.id },
          data: recData,
        });
      } else {
        await tx.tripReconciliation.create({
          data: recData,
        });
      }

      // Transition trip to RECONCILED if not already finalized/closed
      if (!["FINALIZED", "CLOSED"].includes(trip.status)) {
        await tx.deliveryTrip.update({
          where: { id: tripIdNum },
          data: { status: "RECONCILED" },
        });
      }
    });

    const displayKey = [cleanGatePassNo, cleanInvoiceNo].filter(Boolean).join(" / ");
    await ActivityLogger.log(
      "DELIVERY_TRIPS",
      "RECONCILIATION_MANUAL_AUDIT",
      String(tripIdNum),
      `Manual cargo audit saved for Trip #${trip.tripNo} [${displayKey}]. Status: ${computedMatchStatus}. Remarks: ${remarksText}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Manual cargo audit and reconciliation saved successfully for Trip #${trip.tripNo}.`,
      matchStatus: computedMatchStatus,
    });
  } catch (err: any) {
    console.error("Manual override / audit error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Operation failed." }, { status: 500 });
  }
}
