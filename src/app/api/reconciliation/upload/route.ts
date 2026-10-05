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

    // Fetch all active/completed/reconciled delivery trips, gate passes, and their requests
    let vmsTrips: any[] = [];
    try {
      vmsTrips = await prisma.deliveryTrip.findMany({
        where: {
          status: { not: "CANCELLED" },
        },
        include: {
          vehicle: true,
          driver: true,
          gatePasses: true,
          tripRequests: {
            include: {
              request: true,
            },
          },
        },
      });
    } catch (e) {
      console.error("Failed to query VMS trips for reconciliation matching:", e);
      vmsTrips = [];
    }

    // 1. Build Gate Pass lookup map: normalized GP No -> trip
    const vmsGatePassMap = new Map<string, { trip: any; plannedKg: number; plannedBoxes: number; plannedCbm: number }>();

    // 2. Build Invoice lookup map as secondary fallback
    const vmsInvoiceMap = new Map<string, { trip: any; request: any; plannedKg: number; plannedBoxes: number }>();

    for (const trip of vmsTrips) {
      const tripKg = trip.tripRequests.reduce((sum: number, tr: any) => sum + (Number(tr.request?.requiredKg) || 0), 0);
      const tripBoxes = trip.tripRequests.reduce((sum: number, tr: any) => sum + (Number(tr.request?.boxCount) || 0), 0);
      const tripCbm = trip.tripRequests.reduce((sum: number, tr: any) => sum + (Number(tr.request?.requiredCbm) || 0), 0);

      // Register all Gate Passes for this trip
      for (const gp of trip.gatePasses) {
        if (!gp.gatePassNo) continue;
        const cleanGp = String(gp.gatePassNo).trim().toUpperCase();
        vmsGatePassMap.set(cleanGp, { trip, plannedKg: tripKg, plannedBoxes: tripBoxes, plannedCbm: tripCbm });
        const alphanumericGp = cleanGp.replace(/[-_\s]/g, "");
        if (alphanumericGp && alphanumericGp !== cleanGp) {
          vmsGatePassMap.set(alphanumericGp, { trip, plannedKg: tripKg, plannedBoxes: tripBoxes, plannedCbm: tripCbm });
        }
      }

      // Register invoices
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
          const entry = { trip, request: req, plannedKg: reqKg, plannedBoxes: reqBoxes };
          vmsInvoiceMap.set(token, entry);
          const cleanToken = token.replace(/[-_\s]/g, "");
          if (cleanToken && cleanToken !== token) {
            vmsInvoiceMap.set(cleanToken, entry);
          }
        }
      }
    }

    const datatexGatePasses = Object.values(parseResult.gate_passes || {});
    const datatexInvoices = Object.values(parseResult.invoices || {});

    let matchedCount = 0;
    let varianceCount = 0;
    let unmatchedCount = 0;
    const comparisonList: any[] = [];

    // Prioritize Gate Pass matching if the spreadsheet provided gate passes
    const useGatePassMatching = datatexGatePasses.length > 0;

    if (useGatePassMatching) {
      for (const datatexGp of datatexGatePasses) {
        const rawGpNo = String(datatexGp.gate_pass_no || "").trim();
        const lookupKey = rawGpNo.toUpperCase();
        const cleanKey = lookupKey.replace(/[-_\s]/g, "");

        let vmsMatch = vmsGatePassMap.get(lookupKey) || vmsGatePassMap.get(cleanKey);

        // Fallback substring search
        if (!vmsMatch && lookupKey.length >= 4) {
          for (const [key, val] of vmsGatePassMap.entries()) {
            if (key.includes(lookupKey) || lookupKey.includes(key)) {
              vmsMatch = val;
              break;
            }
          }
        }

        if (!vmsMatch) {
          unmatchedCount++;
          comparisonList.push({
            gate_pass_no: rawGpNo,
            vehicle_no: datatexGp.vehicle_no || "-",
            total_kg: datatexGp.total_kg,
            total_boxes: datatexGp.total_boxes,
            match_status: "UNMATCHED",
            vms_trip_id: null,
            vms_trip_no: "N/A",
            variance_kg: datatexGp.total_kg,
            variance_remarks: `Gate Pass [${rawGpNo}] not logged in any active VMS delivery trip`,
          });
          continue;
        }

        const trip = vmsMatch.trip;
        const vmsKg = vmsMatch.plannedKg;
        const vmsBoxes = vmsMatch.plannedBoxes;
        const kgDiff = Math.abs(datatexGp.total_kg - vmsKg);
        const isWithinTolerance = vmsKg > 0 ? (kgDiff / vmsKg) <= 0.05 : (kgDiff === 0 || datatexGp.total_kg === 0);

        const status = isWithinTolerance ? "MATCHED" : "VARIANCE";
        if (status === "MATCHED") matchedCount++;
        else varianceCount++;

        const remarks = isWithinTolerance
          ? `Matched via Gate Pass [${rawGpNo}] with Datatex ERP dispatch register`
          : `Weight Variance: Planned ${vmsKg.toFixed(2)} kg vs Actual ${datatexGp.total_kg.toFixed(2)} kg (Diff: ${(datatexGp.total_kg - vmsKg).toFixed(2)} kg)`;

        const recData = {
          tripId: trip.id,
          gatePassNo: rawGpNo,
          actualVehicleNo: datatexGp.vehicle_no || trip.vehicle?.vehicleNumber || null,
          actualBoxes: datatexGp.total_boxes || 0,
          actualKg: datatexGp.total_kg || 0,
          actualCbm: datatexGp.total_cbm || 0,
          invoiceNumbers: (datatexGp.invoices || []).join(", ") || null,
          customerName: datatexGp.customer_name || null,
          deliveryAddress: datatexGp.delivery_address || null,
          dispatchedDate: datatexGp.dispatched_date || null,
          matchStatus: status,
          varianceRemarks: remarks,
          reconciledBy: user.id,
          reconciledAt: new Date(),
        };

        await prisma.$transaction(async (tx: any) => {
          const existingRec = await tx.tripReconciliation.findFirst({
            where: {
              tripId: trip.id,
              gatePassNo: rawGpNo,
            },
          });

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

          if (!["FINALIZED", "CLOSED", "RECONCILED"].includes(trip.status)) {
            await tx.deliveryTrip.update({
              where: { id: trip.id },
              data: { status: "RECONCILED" },
            });
          }
        });

        comparisonList.push({
          gate_pass_no: rawGpNo,
          vehicle_no: datatexGp.vehicle_no || trip.vehicle?.vehicleNumber || "-",
          total_kg: datatexGp.total_kg,
          total_boxes: datatexGp.total_boxes,
          match_status: status,
          vms_trip_id: trip.id,
          vms_trip_no: trip.tripNo,
          vms_kg: vmsKg,
          vms_boxes: vmsBoxes,
          variance_kg: Number((datatexGp.total_kg - vmsKg).toFixed(2)),
          variance_remarks: remarks,
        });
      }
    } else {
      // Fallback: Invoice matching if gate pass column was absent
      for (const datatexInv of datatexInvoices) {
        const invNo = String(datatexInv.invoice_no || "").trim();
        const lookupKey = invNo.toUpperCase();
        const cleanKey = lookupKey.replace(/[-_\s]/g, "");

        let vmsMatch = vmsInvoiceMap.get(lookupKey) || vmsInvoiceMap.get(cleanKey);

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
            invoice_no: invNo,
            match_status: "UNMATCHED",
            vms_trip_id: null,
            vms_trip_no: "N/A",
            variance_kg: datatexInv.total_kg,
            variance_remarks: "Commercial Invoice not found in any active VMS transport request",
          });
          continue;
        }

        const trip = vmsMatch.trip;
        const vmsKg = vmsMatch.plannedKg;
        const kgDiff = Math.abs(datatexInv.total_kg - vmsKg);
        const isWithinTolerance = vmsKg > 0 ? (kgDiff / vmsKg) <= 0.05 : (kgDiff === 0 || datatexInv.total_kg === 0);

        const status = isWithinTolerance ? "MATCHED" : "VARIANCE";
        if (status === "MATCHED") matchedCount++;
        else varianceCount++;

        const matchedGp = datatexInv.gate_pass_no || trip.gatePasses?.[0]?.gatePassNo || "N/A";

        const recData = {
          tripId: trip.id,
          gatePassNo: matchedGp,
          actualVehicleNo: datatexInv.vehicle_no || trip.vehicle?.vehicleNumber || null,
          actualBoxes: datatexInv.total_boxes || 0,
          actualKg: datatexInv.total_kg || 0,
          actualCbm: datatexInv.total_cbm || 0,
          invoiceNumbers: invNo,
          customerName: datatexInv.customer_name || null,
          deliveryAddress: datatexInv.delivery_address || null,
          dispatchedDate: datatexInv.dispatched_date || null,
          matchStatus: status,
          varianceRemarks: isWithinTolerance
            ? "Matched with Datatex ERP dispatch register"
            : `Weight Variance: Planned ${vmsKg} kg vs Actual ${datatexInv.total_kg} kg`,
          reconciledBy: user.id,
          reconciledAt: new Date(),
        };

        await prisma.$transaction(async (tx: any) => {
          const existingRec = await tx.tripReconciliation.findFirst({
            where: {
              tripId: trip.id,
              OR: [{ invoiceNumbers: invNo }, { gatePassNo: matchedGp }],
            },
          });

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

          if (!["FINALIZED", "CLOSED", "RECONCILED"].includes(trip.status)) {
            await tx.deliveryTrip.update({
              where: { id: trip.id },
              data: { status: "RECONCILED" },
            });
          }
        });

        comparisonList.push({
          invoice_no: invNo,
          gate_pass_no: matchedGp,
          match_status: status,
          vms_trip_id: trip.id,
          vms_trip_no: trip.tripNo,
          variance_kg: Number((datatexInv.total_kg - vmsKg).toFixed(2)),
        });
      }
    }

    const processedTotal = useGatePassMatching ? datatexGatePasses.length : datatexInvoices.length;

    await ActivityLogger.log(
      "RECONCILIATION",
      "UPLOAD",
      `Batch Upload (${processedTotal} Records)`,
      `Processed ${processedTotal} ERP records via ${useGatePassMatching ? "Gate Pass" : "Invoice"} matching. Matched: ${matchedCount}, Variance: ${varianceCount}, Unmatched: ${unmatchedCount}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      matched_by: useGatePassMatching ? "GATE_PASS" : "INVOICE",
      total_rows: parseResult.total_rows,
      record_count: processedTotal,
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
