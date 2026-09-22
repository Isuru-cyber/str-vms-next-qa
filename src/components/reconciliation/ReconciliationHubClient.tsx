"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Check,
  Search,
  Filter,
  ShieldCheck,
  Lock,
  Layers,
  Truck,
  User,
  ArrowRight,
  ExternalLink,
  Printer,
  X,
  AlertCircle,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface ReconciliationTrip {
  id: number;
  tripNo: string;
  status: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  plannedKm: number;
  requestCount: number;
  plannedBoxes: number;
  plannedWeightKg: number;
  invoices?: Array<{
    invoiceNo: string;
    status: string;
  }>;
  gatePasses: Array<{
    id: number;
    gatePassNo: string;
    status: string;
    remarks?: string | null;
  }>;
  latestReconciliation?: {
    matchStatus: string;
    actualVehicleNo?: string | null;
    actualBoxes?: number | null;
    actualKg?: number | null;
    actualCbm?: number | null;
    varianceRemarks?: string | null;
  } | null;
}

interface ReconciliationHubClientProps {
  initialTrips: ReconciliationTrip[];
}

export function ReconciliationHubClient({ initialTrips }: ReconciliationHubClientProps) {
  const [activeTab, setActiveTab] = useState<"trips" | "upload">("trips");
  const [trips, setTrips] = useState<ReconciliationTrip[]>(initialTrips);

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);
  const [resultsFilter, setResultsFilter] = useState<"ALL" | "MATCHED" | "VARIANCE" | "UNMATCHED">("ALL");
  const [error, setError] = useState<string | null>(null);

  // Override Modal
  const [overrideModal, setOverrideModal] = useState<any | null>(null);
  const [targetTripForOverride, setTargetTripForOverride] = useState("");
  const [actualVehicle, setActualVehicle] = useState("");
  const [actualBoxes, setActualBoxes] = useState("");
  const [actualKg, setActualKg] = useState("");
  const [actualCbm, setActualCbm] = useState("");
  const [overrideRemarks, setOverrideRemarks] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);

  // Finalize Modal
  const [finalizeModalTrip, setFinalizeModalTrip] = useState<ReconciliationTrip | null>(null);
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle Excel Upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/reconciliation/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process Datatex sheet.");
      }

      setUploadResults(data.items || []);
      setUploadSummary({
        total: data.invoice_count || data.gate_pass_count || (data.items ? data.items.length : 0),
        matched: data.matched,
        variance: data.variance,
        unmatched: data.unmatched,
      });
      showToast("success", "Datatex dispatch register processed and reconciled.");
    } catch (err: any) {
      setError(err.message || "Upload error.");
      showToast("error", err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Open Override Modal
  const handleOpenOverride = (item: any) => {
    setOverrideModal(item);
    const existingTripId = item.vms_trip_id || item.tripId || item.id;
    setTargetTripForOverride(existingTripId ? String(existingTripId) : "");
    setActualVehicle(item.actual_vehicle || item.actualVehicleNo || item.vehicleNumber || item.vehicle_no || "");
    setActualBoxes(String(item.total_boxes || item.actualBoxes || item.actual_boxes || item.plannedBoxes || 0));
    setActualKg(String(item.total_kg || item.actualKg || item.actual_kg || item.plannedWeightKg || 0));
    setActualCbm(String(item.total_cbm || item.actualCbm || item.actual_cbm || 0));
    setOverrideRemarks(item.variance_remarks || item.varianceRemarks || "Verified & matched with Commercial Invoice dispatch");
  };

  // Submit Override
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModal || !overrideRemarks.trim()) return;

    const tripTargetId = Number(overrideModal.vms_trip_id || overrideModal.tripId || overrideModal.id || targetTripForOverride);
    if (!tripTargetId) {
      showToast("error", "Please select a target delivery trip to bind this commercial invoice.");
      return;
    }

    const currentInv = overrideModal.invoice_no || overrideModal.invoiceNo || overrideModal.gate_pass_no || overrideModal.gatePassNo;

    setIsOverriding(true);
    try {
      const res = await fetch("/api/reconciliation/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: tripTargetId,
          invoiceNo: currentInv,
          gatePassNo: currentInv,
          actualVehicle,
          actualBoxes: parseInt(actualBoxes, 10) || 0,
          actualKg: parseFloat(actualKg) || 0,
          actualCbm: parseFloat(actualCbm) || 0,
          overrideReason: overrideRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Override failed.");
        return;
      }

      // Update upload results table if open
      setUploadResults(
        uploadResults.map((r) =>
          (r.invoice_no === currentInv || r.gate_pass_no === currentInv)
            ? { ...r, match_status: "MANUAL_OVERRIDE", variance_remarks: overrideRemarks, vms_trip_id: tripTargetId }
            : r
        )
      );

      // Update trips list
      setTrips(
        trips.map((t) => {
          const hasInv = (t.invoices && t.invoices.some((inv) => inv.invoiceNo === currentInv)) || t.id === tripTargetId;
          if (hasInv) {
            return {
              ...t,
              status: "RECONCILED",
              latestReconciliation: {
                matchStatus: "MANUAL_OVERRIDE",
                actualVehicleNo: actualVehicle,
                actualBoxes: parseInt(actualBoxes, 10) || 0,
                actualKg: parseFloat(actualKg) || 0,
                actualCbm: parseFloat(actualCbm) || 0,
                varianceRemarks: overrideRemarks,
              },
              invoices: t.invoices?.map((inv) =>
                inv.invoiceNo === currentInv ? { ...inv, status: "RECONCILED" } : inv
              ),
              gatePasses: t.gatePasses.map((gp) =>
                gp.gatePassNo === currentInv ? { ...gp, status: "RECONCILED" } : gp
              ),
            };
          }
          return t;
        })
      );

      setOverrideModal(null);
      showToast("success", data.message);
    } catch (err: any) {
      showToast("error", err.message || "Network error.");
    } finally {
      setIsOverriding(false);
    }
  };

  // Submit Finalize Trip (Transitions to FINALIZED)
  const handleFinalizeTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalizeModalTrip) return;

    setIsFinalizing(true);
    try {
      const res = await fetch("/api/reconciliation/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: finalizeModalTrip.id,
          notes: finalizeNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Finalization failed.");
        return;
      }

      setTrips(
        trips.map((t) => (t.id === finalizeModalTrip.id ? { ...t, status: "FINALIZED" } : t))
      );

      setFinalizeModalTrip(null);
      setFinalizeNotes("");
      showToast("success", data.message || "Trip finalized successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Network error.");
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold text-white transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 border border-emerald-500"
              : "bg-rose-600 border border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Slim Header & Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pt-1">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Commercial Invoice Reconciliation
          </h1>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("trips")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "trips"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Trips & Invoices ({trips.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "upload"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Datatex Excel Matcher
          </button>
        </div>
      </div>

      {/* TAB 1: Trips Audit & Finalization Ledger */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Dispatched Trips Awaiting Reconciliation & Final Approval
                </h3>
                <p className="text-[11px] text-gray-500">
                  Review planned invoices, verify Datatex dispatch actuals, and finalize trips
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Trip No</th>
                    <th className="py-3 px-4">Vehicle & Driver</th>
                    <th className="py-3 px-4">Commercial Invoices</th>
                    <th className="py-3 px-4">Cargo (Planned vs Reconciled)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No trips currently awaiting reconciliation.
                      </td>
                    </tr>
                  ) : (
                    trips.map((t) => {
                      const isFinalized = ["FINALIZED", "CLOSED"].includes(t.status);
                      const isCompleted = t.status === "COMPLETED";
                      const isReconciled = t.status === "RECONCILED";
                      const rec = t.latestReconciliation;

                      const tripInvoices = t.invoices && t.invoices.length > 0
                        ? t.invoices
                        : t.gatePasses.map((gp) => ({ invoiceNo: gp.gatePassNo, status: gp.status }));

                      return (
                        <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-indigo-700 text-sm tracking-tight">
                              {t.tripNo}
                            </div>
                            <div className="text-[11px] text-gray-400 tabular-nums">
                              {t.plannedKm} km planned
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900 flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>{t.vehicleNumber}</span>
                              <span className="text-gray-400 text-[10px] font-normal">
                                ({t.vehicleType})
                              </span>
                            </div>
                            <div className="text-gray-500 text-[11px] flex items-center gap-1">
                              <User className="w-3 h-3 text-gray-400" />
                              <span>{t.driverName}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[240px]">
                            {tripInvoices.length === 0 ? (
                              <span className="text-gray-400 italic text-[11px]">
                                No invoices recorded
                              </span>
                            ) : (
                              <div className="relative group inline-block">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {tripInvoices.slice(0, 2).map((inv, idx) => (
                                    <span
                                      key={idx}
                                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tabular-nums border ${
                                        inv.status === "RECONCILED"
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          : "bg-amber-50 text-amber-700 border-amber-200"
                                      }`}
                                    >
                                      <span>{inv.invoiceNo}</span>
                                      {inv.status === "RECONCILED" && (
                                        <Check className="w-2.5 h-2.5" />
                                      )}
                                    </span>
                                  ))}

                                  {tripInvoices.length > 2 && (
                                    <span
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tabular-nums bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                                      title="Hover to view all invoices"
                                    >
                                      +{tripInvoices.length - 2} more
                                    </span>
                                  )}
                                </div>

                                {/* Floating Hover Popover for all Invoices */}
                                {tripInvoices.length > 2 && (
                                  <div className="hidden group-hover:block absolute left-0 top-full mt-1.5 z-50 w-64 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 text-xs transition-all animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-slate-800">
                                      <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px]">
                                        Commercial Invoices
                                      </span>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 tabular-nums">
                                        {tripInvoices.length} total
                                      </span>
                                    </div>
                                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                                      {tripInvoices.map((inv, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700"
                                        >
                                          <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                            {inv.invoiceNo}
                                          </span>
                                          <span
                                            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                              inv.status === "RECONCILED"
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                            }`}
                                          >
                                            {inv.status === "RECONCILED" ? "Reconciled" : "Pending"}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-gray-700 tabular-nums">
                            <div>
                              <span>Planned: </span>
                              <strong>{formatNumber(t.plannedWeightKg, 0)} kg</strong> &bull;{" "}
                              <span>{t.plannedBoxes} bxs</span>
                            </div>
                            {rec && rec.actualKg !== null && rec.actualKg !== undefined && (
                              <div className="text-[11px] text-emerald-700">
                                <span>Actual: </span>
                                <strong>{formatNumber(rec.actualKg, 0)} kg</strong> &bull;{" "}
                                <span>{rec.actualBoxes} bxs</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <StatusBadge status={t.status} />
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/trips/${t.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold"
                                title="View Trip Manifest"
                              >
                                <Printer className="w-3.5 h-3.5 text-gray-500" />
                                <span>Manifest</span>
                              </Link>

                              {!isFinalized && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const primaryInv = tripInvoices[0]?.invoiceNo || `TRIP-${t.tripNo}`;
                                    handleOpenOverride({
                                      vms_trip_id: t.id,
                                      invoice_no: primaryInv,
                                      gate_pass_no: primaryInv,
                                      actual_vehicle: t.vehicleNumber !== "-" ? t.vehicleNumber : "",
                                      total_boxes: t.plannedBoxes,
                                      total_kg: t.plannedWeightKg,
                                      total_cbm: 0,
                                      variance_remarks: "Verified & matched with Commercial Invoice dispatch",
                                    });
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 cursor-pointer shadow-2xs"
                                  title="Manual reconcile and verify dispatch actuals"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Reconcile</span>
                                </button>
                              )}

                              {!isFinalized && Boolean(t.latestReconciliation || t.status === "RECONCILED" || t.status === "COMPLETED") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFinalizeModalTrip(t);
                                    setFinalizeNotes("");
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
                                  title="Finalize trip into audited financial reports"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Finalize</span>
                                </button>
                              )}

                              {isFinalized && (
                                <Link
                                  href="/pod"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 cursor-pointer shadow-2xs"
                                  title="View Proof of Delivery (POD) for this trip"
                                >
                                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>POD Hub</span>
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Datatex ERP Excel Batch Matcher */}
      {activeTab === "upload" && (
        <div className="space-y-6">
          {/* Upload Dropzone */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Upload Daily Datatex ERP Dispatch Register (.xlsx or .csv)
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Automatically scans commercial invoices, compares weights and box counts, flags variances, and reconciles records.
              </p>
            </div>

            <form
              onSubmit={handleFileUpload}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="flex-1 w-full relative">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>
              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{uploading ? "Processing Datatex Sheet..." : "Upload & Reconcile"}</span>
              </button>
            </form>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Metrics Summary */}
          {uploadSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
                <span className="text-[10px] text-gray-500 font-semibold uppercase">
                  Total Invoices
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight tabular-nums">
                  {uploadSummary.total}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <span className="text-[10px] text-emerald-800 font-semibold uppercase">
                  100% Matched
                </span>
                <p className="text-2xl font-bold text-emerald-600 mt-1 tracking-tight tabular-nums">
                  {uploadSummary.matched}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-orange-200 bg-orange-50/20 shadow-xs">
                <span className="text-[10px] text-orange-800 font-semibold uppercase">
                  Weight Variance
                </span>
                <p className="text-2xl font-bold text-orange-600 mt-1 tracking-tight tabular-nums">
                  {uploadSummary.variance}
                </p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                <span className="text-[10px] text-rose-800 font-semibold uppercase">Unmatched Invoices</span>
                <p className="text-2xl font-bold text-rose-600 mt-1 tracking-tight tabular-nums">
                  {uploadSummary.unmatched}
                </p>
              </div>
            </div>
          )}

          {/* Results Comparison Table */}
          {uploadResults.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Invoice Audit Comparison Ledger
                </h3>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(["ALL", "MATCHED", "VARIANCE", "UNMATCHED"] as const).map((filterVal) => {
                    const count =
                      filterVal === "ALL"
                        ? uploadResults.length
                        : filterVal === "MATCHED"
                        ? uploadSummary?.matched ?? uploadResults.filter((r) => r.match_status === "MATCHED").length
                        : filterVal === "VARIANCE"
                        ? uploadSummary?.variance ?? uploadResults.filter((r) => r.match_status === "VARIANCE").length
                        : uploadSummary?.unmatched ?? uploadResults.filter((r) => r.match_status === "UNMATCHED").length;

                    return (
                      <button
                        key={filterVal}
                        type="button"
                        onClick={() => setResultsFilter(filterVal)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          resultsFilter === filterVal
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        }`}
                      >
                        {filterVal === "ALL" ? "All Invoices" : filterVal === "MATCHED" ? "Matched" : filterVal === "VARIANCE" ? "Variance" : "Unmatched"}{" "}
                        <span className="tabular-nums">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Commercial Invoice No</th>
                      <th className="py-3 px-4">Trip No & Vehicle</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Datatex Actual KG</th>
                      <th className="py-3 px-4">VMS Planned KG</th>
                      <th className="py-3 px-4">Variance</th>
                      <th className="py-3 px-4">Match Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {uploadResults
                      .filter((r) => resultsFilter === "ALL" || r.match_status === resultsFilter)
                      .map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-indigo-700 tracking-tight tabular-nums">
                            {r.invoice_no || r.gate_pass_no}
                          </div>
                          {r.gate_pass_no && r.gate_pass_no !== r.invoice_no && (
                            <div className="text-[10px] text-gray-400">
                              GP: {r.gate_pass_no}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-gray-900 tracking-tight">
                            {r.vms_trip_no || "N/A"}
                          </div>
                          <div className="text-[11px] text-gray-500 tabular-nums">
                            {r.vehicle_no || r.vms_vehicle || "-"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-800 truncate max-w-[140px]">
                          {r.customer_name || "-"}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900 tabular-nums">
                          {formatNumber(r.total_kg, 2)} kg
                        </td>
                        <td className="py-3 px-4 text-gray-600 tabular-nums">
                          {formatNumber(r.vms_kg, 2)} kg
                        </td>
                        <td className="py-3 px-4 font-semibold tabular-nums">
                          <span
                            className={
                              r.variance_kg > 0
                                ? "text-rose-600 font-bold"
                                : r.variance_kg < 0
                                ? "text-amber-600 font-bold"
                                : "text-gray-500"
                            }
                          >
                            {r.variance_kg > 0 ? `+${r.variance_kg}` : r.variance_kg} kg
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={r.match_status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(r.match_status === "VARIANCE" || r.match_status === "UNMATCHED") && (
                            <button
                              type="button"
                              onClick={() => handleOpenOverride(r)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                                r.match_status === "UNMATCHED"
                                  ? "bg-rose-100 text-rose-800 hover:bg-rose-200"
                                  : "bg-orange-100 text-orange-800 hover:bg-orange-200"
                              }`}
                            >
                              {r.match_status === "UNMATCHED" ? "Bind & Match" : "Override"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Variance Manual Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Reconcile &amp; Audit Actuals: {overrideModal.invoice_no || overrideModal.invoiceNo || overrideModal.gate_pass_no || overrideModal.gatePassNo}
                </h3>
                <p className="text-xs text-gray-500">Record actual dispatch quantities, vehicle plate &amp; verification remarks</p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitOverride} className="space-y-3.5 text-xs">
              {(!overrideModal.vms_trip_id && !overrideModal.tripId && !overrideModal.id) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <label className="text-amber-900 block text-[10px] uppercase font-bold">
                    Target Delivery Trip to Bind <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={targetTripForOverride}
                    onChange={(e) => setTargetTripForOverride(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="">-- Select Target Delivery Trip --</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        Trip #{t.tripNo} — {t.vehicleNumber} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Actual Vehicle Lorry
                  </span>
                  <input
                    type="text"
                    value={actualVehicle}
                    onChange={(e) => setActualVehicle(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-gray-300 rounded-xl px-3 py-2 mt-1 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Actual Boxes
                  </span>
                  <input
                    type="number"
                    value={actualBoxes}
                    onChange={(e) => setActualBoxes(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 mt-1 tabular-nums focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 p-3.5 bg-gray-50 rounded-xl">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Actual Weight (KG)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={actualKg}
                    onChange={(e) => setActualKg(e.target.value)}
                    className="w-full text-xs font-bold text-indigo-700 bg-white border border-gray-300 rounded-xl px-3 py-2 mt-1 tabular-nums focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold">
                    Actual Volume (CBM)
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCbm}
                    onChange={(e) => setActualCbm(e.target.value)}
                    className="w-full text-xs bg-white border border-gray-300 rounded-xl px-3 py-2 mt-1 tabular-nums focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Auditor Verification / Variance Remarks <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideRemarks}
                  onChange={(e) => setOverrideRemarks(e.target.value)}
                  placeholder="Explain the operational verification or cargo variance details..."
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOverrideModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!overrideRemarks.trim() || isOverriding}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isOverriding ? "Saving..." : "Save Reconciliation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Finalize Trip Modal */}
      {finalizeModalTrip && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Finalize Trip: {finalizeModalTrip.tripNo}
                  </h3>
                  <p className="text-xs text-gray-500">Lock trip actuals and release resources</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFinalizeModalTrip(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFinalizeTrip} className="space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                <p className="text-emerald-900 font-semibold">
                  Administrator Final Approval & Audit Lock
                </p>
                <p className="text-emerald-700 text-[11px] leading-relaxed">
                  Finalizing will permanently lock trip actuals, mark linked cargo requests as
                  COMPLETED, release vehicle <strong>{finalizeModalTrip.vehicleNumber}</strong> and
                  driver <strong>{finalizeModalTrip.driverName}</strong> back to AVAILABLE status, and
                  commit data to Finance & Costing reports.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Audit Sign-Off Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                  placeholder="e.g. Verified by Logistics Manager. All receipts reconciled."
                  className="w-full text-xs border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setFinalizeModalTrip(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFinalizing}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isFinalizing ? "Finalizing..." : "Approve & Finalize"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
