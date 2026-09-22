import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ adminOnly: true });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const {
      tripId,
      invoiceNo,
      gatePassNo,
      actualVehicle,
      actualBoxes,
      actualKg,
      actualCbm,
      overrideReason,
    } = body;

    const primaryKey = String(invoiceNo || gatePassNo || "").trim().toUpperCase();

    if (!tripId || !primaryKey || !overrideReason?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Trip ID, Commercial Invoice / Gate Pass No, and a valid Audit Override Reason are required.",
        },
        { status: 400 }
      );
    }

    const tripIdNum = Number(tripId);

    await prisma.$transaction(async (tx: any) => {
      // Find existing reconciliation or create new
      const existingRec = await tx.tripReconciliation.findFirst({
        where: {
          tripId: tripIdNum,
          OR: [
            { invoiceNumbers: primaryKey },
            { gatePassNo: primaryKey },
          ],
        },
      });

      const recData = {
        tripId: tripIdNum,
        gatePassNo: primaryKey,
        invoiceNumbers: primaryKey,
        actualVehicleNo: actualVehicle || null,
        actualBoxes: actualBoxes ? Number(actualBoxes) : 0,
        actualKg: actualKg ? Number(actualKg) : 0,
        actualCbm: actualCbm ? Number(actualCbm) : 0,
        matchStatus: "MANUAL_OVERRIDE",
        varianceRemarks: `Manual Override: ${overrideReason.trim()}`,
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

      // Check trip status inside the same transaction
      const targetTrip = await tx.deliveryTrip.findUnique({
        where: { id: tripIdNum },
        select: { status: true },
      });

      if (!targetTrip) {
        throw new Error("Target delivery trip not found.");
      }

      if (!["FINALIZED", "CLOSED"].includes(targetTrip.status)) {
        await tx.deliveryTrip.update({
          where: { id: tripIdNum },
          data: { status: "RECONCILED" },
        });
      }
    });

    await ActivityLogger.log(
      "DELIVERY_TRIPS",
      "RECONCILIATION_MANUAL_OVERRIDE",
      String(tripIdNum),
      `Manual override applied for Invoice [${primaryKey}]. Reason: ${overrideReason.trim()}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Manual override applied for Invoice ${primaryKey}.`,
    });
  } catch (err: any) {
    console.error("Manual override error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Operation failed." }, { status: 500 });
  }
}
