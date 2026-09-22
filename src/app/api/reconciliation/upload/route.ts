import { NextRequest, NextResponse } from "next/server";
import { DatatexParser } from "@/lib/datatex-parser";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "dispatch_audit" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, message: "No file provided." }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "File size exceeds the 10MB limit." },
        { status: 400 }
      );
    }

    const fileName = (file.name || "").toLowerCase();
    const isExcelOrCsv = fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv");
    if (!isExcelOrCsv) {
      return NextResponse.json(
        { success: false, message: "Invalid file format. Only Excel (.xlsx, .xls) and CSV files are allowed." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel / CSV using DatatexParser
    const parseResult = DatatexParser.parseBuffer(buffer);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: parseResult.errors.join(", ") || "Failed to parse file.",
        },
        { status: 400 }
      );
    }

    // Match invoices against VMS trips and transport requests
    const datatexInvoices = Object.values(parseResult.invoices);
    const invoiceKeys = Object.keys(parseResult.invoices);

    // Fetch all active/completed/reconciled delivery trips and their requests
    let vmsTrips: any[] = [];
    try {
      vmsTrips = await prisma.deliveryTrip.findMany({
        where: {
          status: { not: "CANCELLED" },
          tripRequests: {
            some: {
              request: {
                invoiceNumbers: { not: null },
              },
            },
          },
        },
        include: {
          vehicle: true,
          driver: true,
          tripRequests: {
            include: {
              request: true,
            },
          },
        },
      });
    } catch (e) {
      console.error("Failed to query VMS trips for invoice matching:", e);
      vmsTrips = [];
    }

    // Build an invoice lookup map: normalized token -> { trip, request, plannedKg, plannedBoxes }
    const vmsInvoiceMap = new Map<string, { trip: any; request: any; plannedKg: number; plannedBoxes: number }>();

    for (const trip of vmsTrips) {
      for (const tr of trip.tripRequests) {
        const req = tr.request;
        if (!req || !req.invoiceNumbers) continue;

        const tokens = req.invoiceNumbers
          .split(/[\r\n,;]+/)
          .map((s: string) => s.trim().toUpperCase())
          .filter(Boolean);

        const reqKg = Number(req.requiredKg || 0);
        const reqBoxes = Number(req.boxCount || 0);

        for (const token of tokens) {
          const entry = {
            trip,
            request: req,
            plannedKg: reqKg,
            plannedBoxes: reqBoxes,
          };
          vmsInvoiceMap.set(token, entry);
          // Also set without special characters for fuzzy matching
          const cleanToken = token.replace(/[-_\s]/g, "");
          if (cleanToken && cleanToken !== token) {
            vmsInvoiceMap.set(cleanToken, entry);
          }
        }
      }
    }

    let matchedCount = 0;
    let varianceCount = 0;
    let unmatchedCount = 0;

    const comparisonList: any[] = [];

    for (const datatexInv of datatexInvoices) {
      const invNo = String(datatexInv.invoice_no || "").trim();
      const lookupKey = invNo.toUpperCase();
      const cleanKey = lookupKey.replace(/[-_\s]/g, "");

      // 1. Exact or clean key match
      let vmsMatch = vmsInvoiceMap.get(lookupKey) || vmsInvoiceMap.get(cleanKey);

      // 2. Substring fallback match
      if (!vmsMatch && lookupKey.length >= 4) {
        for (const [key, val] of vmsInvoiceMap.entries()) {
          if (key.includes(lookupKey) || lookupKey.includes(key)) {
            vmsMatch = val;
            break;
          }
        }
      }

      if (!vmsMatch) {
        unmatchedCount++;
        comparisonList.push({
          ...datatexInv,
          match_status: "UNMATCHED",
          vms_trip_id: null,
          vms_trip_no: "N/A",
          vms_vehicle: datatexInv.vehicle_no || "-",
          vms_kg: 0,
          vms_boxes: 0,
          variance_kg: datatexInv.total_kg,
          variance_remarks: "Commercial Invoice not found in any active VMS transport request",
        });
        continue;
      }

      const trip = vmsMatch.trip;
      const vmsKg = vmsMatch.plannedKg;
      const vmsBoxes = vmsMatch.plannedBoxes;
      const kgDiff = Math.abs(datatexInv.total_kg - vmsKg);
      const isWithinTolerance = vmsKg > 0 ? (kgDiff / vmsKg) <= 0.05 : (kgDiff === 0 || datatexInv.total_kg === 0);

      const status = isWithinTolerance ? "MATCHED" : "VARIANCE";
      if (status === "MATCHED") matchedCount++;
      else varianceCount++;

      const tripId = trip.id;
      const remarks = isWithinTolerance
        ? "Matched with Datatex ERP dispatch register"
        : `Weight Variance: Planned ${vmsKg} kg vs Actual ${datatexInv.total_kg} kg (Diff: ${(datatexInv.total_kg - vmsKg).toFixed(2)} kg)`;

      // Persist reconciliation record
      const existingRec = await prisma.tripReconciliation.findFirst({
        where: {
          tripId,
          OR: [
            { invoiceNumbers: invNo },
            { gatePassNo: invNo },
            ...(datatexInv.gate_pass_no ? [{ gatePassNo: datatexInv.gate_pass_no }] : []),
          ],
        },
      });

      const recData = {
        tripId,
        gatePassNo: datatexInv.gate_pass_no || invNo,
        actualVehicleNo: datatexInv.vehicle_no || trip.vehicle?.vehicleNumber || null,
        actualBoxes: datatexInv.total_boxes || 0,
        actualKg: datatexInv.total_kg || 0,
        actualCbm: datatexInv.total_cbm || 0,
        invoiceNumbers: invNo,
        customerName: datatexInv.customer_name || null,
        deliveryAddress: datatexInv.delivery_address || null,
        dispatchedDate: datatexInv.dispatched_date || null,
        matchStatus: status,
        varianceRemarks: remarks,
        reconciledBy: user.id,
        reconciledAt: new Date(),
      };

      if (existingRec) {
        await prisma.tripReconciliation.update({
          where: { id: existingRec.id },
          data: recData,
        });
      } else {
        await prisma.tripReconciliation.create({
          data: recData,
        });
      }

      // If trip is not yet finalized or closed, transition to RECONCILED
      if (!["FINALIZED", "CLOSED"].includes(trip.status)) {
        await prisma.deliveryTrip.update({
          where: { id: tripId },
          data: { status: "RECONCILED" },
        });
      }

      comparisonList.push({
        ...datatexInv,
        match_status: status,
        vms_trip_id: tripId,
        vms_trip_no: trip.tripNo,
        vms_vehicle: trip.vehicle?.vehicleNumber || datatexInv.vehicle_no || "-",
        vms_kg: vmsKg,
        vms_boxes: vmsBoxes,
        variance_kg: Number((datatexInv.total_kg - vmsKg).toFixed(2)),
        variance_remarks: remarks,
      });
    }

    await ActivityLogger.log(
      "RECONCILIATION",
      "DATATEX_INVOICE_RECONCILIATION_SYNC",
      file.name,
      `Uploaded ${file.name}: ${matchedCount} Matched, ${varianceCount} Variances, ${unmatchedCount} Unmatched Invoices`,
      user.id
    );

    return NextResponse.json({
      success: true,
      total_rows: parseResult.total_rows,
      invoice_count: invoiceKeys.length,
      gate_pass_count: invoiceKeys.length,
      matched: matchedCount,
      variance: varianceCount,
      unmatched: unmatchedCount,
      items: comparisonList,
    });
  } catch (err: any) {
    console.error("Reconciliation upload error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Parsing error." },
      { status: 500 }
    );
  }
}
