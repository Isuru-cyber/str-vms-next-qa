"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
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
  Ticket,
  ClipboardCheck,
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
  plannedCbm?: number;
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

  // Filters for Tab 1
  const [searchQuery, setSearchQuery] = useState("");
  const [gpFilter, setGpFilter] = useState<"ALL" | "READY" | "MISSING">("ALL");

  // File Upload State
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadSummary, setUploadSummary] = useState<any | null>(null);
  const [resultsFilter, setResultsFilter] = useState<"ALL" | "MATCHED" | "VARIANCE" | "UNMATCHED">("ALL");
  const [error, setError] = useState<string | null>(null);

  // Override / Manual Audit Modal
  const [overrideModal, setOverrideModal] = useState<any | null>(null);
  const [targetTripForOverride, setTargetTripForOverride] = useState("");
  const [modalGatePassNo, setModalGatePassNo] = useState("");
  const [actualVehicle, setActualVehicle] = useState("");
  const [actualBoxes, setActualBoxes] = useState("");
  const [actualKg, setActualKg] = useState("");
  const [actualCbm, setActualCbm] = useState("");
  const [auditorVerification, setAuditorVerification] = useState<"VERIFIED" | "DISCREPANCY_FLAGGED">("VERIFIED");
  const [overrideRemarks, setOverrideRemarks] = useState("");
  const [isOverriding, setIsOverriding] = useState(false);

  // Finalize Modal
  const [finalizeModalTrip, setFinalizeModalTrip] = useState<ReconciliationTrip | null>(null);
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [finalizeConfirmed, setFinalizeConfirmed] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ type, message });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
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

  // Open Override / Manual Audit Modal
  const handleOpenOverride = (item: any) => {
    setOverrideModal(item);
    const existingTripId = item.vms_trip_id || item.tripId || item.id;
    setTargetTripForOverride(existingTripId ? String(existingTripId) : "");
    setActualVehicle(item.actual_vehicle || item.actualVehicleNo || item.vehicleNumber || item.vehicle_no || "");

    const foundTrip = trips.find((t) => t.id === Number(existingTripId)) || item;
    const existingGp = (foundTrip.gatePasses && foundTrip.gatePasses.length > 0)
      ? foundTrip.gatePasses.map((g: any) => g.gatePassNo).join(", ")
      : (item.gate_pass_no || item.gatePassNo || "");
    setModalGatePassNo(existingGp);

    const pBoxes = foundTrip.plannedBoxes ?? item.total_boxes ?? 0;
    const pKg = foundTrip.plannedWeightKg ?? item.total_kg ?? 0;
    const pCbm = foundTrip.plannedCbm ?? item.total_cbm ?? 0;

    const existingActualBoxes = foundTrip.latestReconciliation?.actualBoxes ?? item.actual_boxes ?? item.total_boxes;
    const existingActualKg = foundTrip.latestReconciliation?.actualKg ?? item.actual_kg ?? item.total_kg;
    const existingActualCbm = foundTrip.latestReconciliation?.actualCbm ?? item.actual_cbm ?? item.total_cbm;

    setActualBoxes(existingActualBoxes !== undefined && existingActualBoxes !== null ? String(existingActualBoxes) : String(pBoxes));
    setActualKg(existingActualKg !== undefined && existingActualKg !== null ? String(existingActualKg) : String(pKg));
    setActualCbm(existingActualCbm !== undefined && existingActualCbm !== null ? String(existingActualCbm) : String(pCbm));

    const matchStat = foundTrip.latestReconciliation?.matchStatus || item.match_status;
    setAuditorVerification(matchStat === "VARIANCE" ? "DISCREPANCY_FLAGGED" : "VERIFIED");
    setOverrideRemarks(foundTrip.latestReconciliation?.varianceRemarks || item.variance_remarks || item.varianceRemarks || "");
  };

  // Submit Override / Manual Audit
  const handleSubmitOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModal) return;

    const tripTargetId = Number(overrideModal.vms_trip_id || overrideModal.tripId || overrideModal.id || targetTripForOverride);
    if (!tripTargetId) {
      showToast("error", "Please select a target delivery trip to bind this record.");
      return;
    }

    if (!overrideRemarks.trim()) {
      showToast("error", "Auditor Verification remarks / Variance notes are required.");
      return;
    }

    const cleanGp = modalGatePassNo.trim() || overrideModal.gatePassNo || overrideModal.gate_pass_no || `GP-${tripTargetId}`;

    setIsOverriding(true);
    try {
      const res = await fetch("/api/reconciliation/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: tripTargetId,
          gatePassNo: cleanGp,
          actualVehicle,
          actualBoxes: parseInt(actualBoxes, 10) || 0,
          actualKg: parseFloat(actualKg) || 0,
          actualCbm: parseFloat(actualCbm) || 0,
          auditorVerification,
          varianceRemarks: overrideRemarks.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Manual audit failed.");
        return;
      }

      // Update upload results table if open
      setUploadResults(
        uploadResults.map((r) =>
          (r.gate_pass_no === cleanGp || r.vms_trip_id === tripTargetId)
            ? { ...r, match_status: data.matchStatus || "MATCHED", variance_remarks: overrideRemarks, vms_trip_id: tripTargetId }
            : r
        )
      );

      // Update trips list
      setTrips(
        trips.map((t) => {
          if (t.id === tripTargetId) {
            const isAlreadyFinal = ["FINALIZED", "CLOSED"].includes(t.status);
            return {
              ...t,
              status: isAlreadyFinal ? t.status : "RECONCILED",
              gatePasses: t.gatePasses && t.gatePasses.length > 0
                ? t.gatePasses
                : [{ id: 0, gatePassNo: cleanGp, status: "ENTERED" }],
              latestReconciliation: {
                matchStatus: data.matchStatus || (auditorVerification === "VERIFIED" ? "MATCHED" : "VARIANCE"),
                actualVehicleNo: actualVehicle,
                actualBoxes: parseInt(actualBoxes, 10) || 0,
                actualKg: parseFloat(actualKg) || 0,
                actualCbm: parseFloat(actualCbm) || 0,
                varianceRemarks: overrideRemarks.trim(),
              },
            };
          }
          return t;
        })
      );

      setOverrideModal(null);
      showToast("success", data.message || "Manual cargo audit and reconciliation saved successfully!");
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

    if (!finalizeConfirmed) {
      showToast("error", "Please confirm audit sign-off by ticking the confirmation checkbox.");
      return;
    }

    if (
      finalizeModalTrip.status !== "RECONCILED" &&
      !finalizeModalTrip.latestReconciliation
    ) {
      showToast("error", "Cannot finalize: Trip reconciliation must be performed first.");
      return;
    }

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
      setFinalizeConfirmed(false);
      showToast("success", data.message || "Trip finalized successfully!");
    } catch (err: any) {
      showToast("error", err.message || "Network error.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const countGpReady = useMemo(
    () => trips.filter((t: ReconciliationTrip) => t.gatePasses && t.gatePasses.length > 0).length,
    [trips]
  );
  const countGpMissing = useMemo(
    () => trips.filter((t: ReconciliationTrip) => !t.gatePasses || t.gatePasses.length === 0).length,
    [trips]
  );

  const filteredTrips = useMemo(() => {
    return trips.filter((t: ReconciliationTrip) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.tripNo.toLowerCase().includes(q) ||
        t.vehicleNumber.toLowerCase().includes(q) ||
        t.driverName.toLowerCase().includes(q) ||
        t.gatePasses.some((g) => g.gatePassNo.toLowerCase().includes(q));

      let matchesGp = true;
      const hasGp = t.gatePasses && t.gatePasses.length > 0;
      if (gpFilter === "READY") {
        matchesGp = Boolean(hasGp);
      } else if (gpFilter === "MISSING") {
        matchesGp = !hasGp;
      }

      return matchesSearch && matchesGp;
    });
  }, [trips, searchQuery, gpFilter]);

  return (
    <div className="space-y-3 flex flex-col min-h-0">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pt-1 shrink-0">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Commercial Invoice &amp; Gate Pass Reconciliation
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
            Trips Reconciliation ({trips.length})
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
                  Dispatched Trips Awaiting Reconciliation &amp; Final Approval
                </h3>
                <p className="text-[11px] text-gray-500">
                  Verify physical Gate Passes, audit actual cargo weights, and finalize reconciliation
                </p>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 bg-slate-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search trip no, vehicle, driver, gate pass..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-white rounded-lg border border-gray-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setGpFilter("ALL")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    gpFilter === "ALL"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <span>All Trips</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${gpFilter === "ALL" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
                    {trips.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGpFilter("READY")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    gpFilter === "READY"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Ticket className="w-3 h-3 text-indigo-400" />
                  <span>Gate Pass Ready</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${gpFilter === "READY" ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-700"}`}>
                    {countGpReady}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setGpFilter("MISSING")}
                  className={`h-7 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    gpFilter === "MISSING"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                  <span>Needs Gate Pass</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${gpFilter === "MISSING" ? "bg-white/20 text-white" : "bg-amber-50 text-amber-800"}`}>
                    {countGpMissing}
                  </span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)] scrollbar-thin">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
                  <tr>
                    <th className="py-3 px-4">Trip No</th>
                    <th className="py-3 px-4">Vehicle & Driver</th>
                    <th className="py-3 px-4">Gate Pass(es)</th>
                    <th className="py-3 px-4">Cargo (Planned vs Reconciled)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTrips.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No trips match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTrips.map((t: ReconciliationTrip) => {
                      const isFinalized = ["FINALIZED", "CLOSED"].includes(t.status);
                      const isReconciled = t.status === "RECONCILED";
                      const rec = t.latestReconciliation;

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
                            {t.gatePasses && t.gatePasses.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {t.gatePasses.map((gp: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums bg-indigo-50 text-indigo-700 border border-indigo-200"
                                    title={`Gate Pass: ${gp.gatePassNo}`}
                                  >
                                    <Ticket className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span>{gp.gatePassNo}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>Needs Gate Pass</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-gray-700 tabular-nums">
                            <div className="text-xs">
                              <span className="text-gray-500 font-medium">Planned: </span>
                              <strong>{formatNumber(t.plannedWeightKg, 1)} kg</strong> &bull;{" "}
                              <span>{t.plannedBoxes} bxs</span>
                              {t.plannedCbm ? <span> &bull; {formatNumber(t.plannedCbm, 2)} cbm</span> : null}
                            </div>
                            {rec && rec.actualKg !== null && rec.actualKg !== undefined && (
                              <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center gap-1 font-semibold">
                                <span>Actual: </span>
                                <strong>{formatNumber(rec.actualKg, 1)} kg</strong> &bull;{" "}
                                <span>{rec.actualBoxes} bxs</span>
                                {rec.actualCbm ? <span> &bull; {formatNumber(rec.actualCbm, 2)} cbm</span> : null}
                                {Math.abs(Number(rec.actualKg) - t.plannedWeightKg) > 1 && (
                                  <span
                                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      rec.matchStatus === "VARIANCE"
                                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                                        : "bg-emerald-100 text-emerald-900"
                                    }`}
                                  >
                                    {Number(rec.actualKg) - t.plannedWeightKg > 0 ? "+" : ""}
                                    {(Number(rec.actualKg) - t.plannedWeightKg).toFixed(1)} kg
                                  </span>
                                )}
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
                                  onClick={() => handleOpenOverride(t)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 cursor-pointer shadow-2xs"
                                  title="Manual audit, verify cargo & gate pass actuals"
                                >
                                  <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Audit Actuals</span>
                                </button>
                              )}

                              {!isFinalized && (t.status === "RECONCILED" || Boolean(t.latestReconciliation)) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFinalizeModalTrip(t);
                                    setFinalizeNotes("");
                                    setFinalizeConfirmed(false);
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

              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
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

      {/* MODAL 1: Manual Cargo Audit & Reconciliation Modal */}
      {overrideModal && (() => {
        const selectedTrip = trips.find((t) => t.id === Number(overrideModal.vms_trip_id || overrideModal.tripId || overrideModal.id || targetTripForOverride));
        const plannedBoxesVal = selectedTrip?.plannedBoxes ?? overrideModal?.total_boxes ?? 0;
        const plannedKgVal = selectedTrip?.plannedWeightKg ?? overrideModal?.total_kg ?? 0;
        const plannedCbmVal = selectedTrip?.plannedCbm ?? overrideModal?.total_cbm ?? 0;

        const currentActualBoxes = parseInt(actualBoxes, 10) || 0;
        const currentActualKg = parseFloat(actualKg) || 0;
        const currentActualCbm = parseFloat(actualCbm) || 0;

        const diffBoxes = currentActualBoxes - plannedBoxesVal;
        const diffKg = currentActualKg - plannedKgVal;
        const diffCbm = currentActualCbm - plannedCbmVal;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 shadow-2xl space-y-4 border border-gray-200 animate-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                      Manual Cargo Audit &amp; Reconciliation — Trip #{selectedTrip?.tripNo || overrideModal.tripNo || overrideModal.vms_trip_no || "N/A"}
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Verify physical Gate Pass, audit cargo weights &amp; sign off reconciliation
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOverrideModal(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitOverride} className="space-y-3.5 text-xs">
                {/* Trip binding selector if opened from unmatched upload */}
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

                {/* Gate Pass Input Box */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-800">
                    Physical Gate Pass Number(s) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Ticket className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Enter Gate Pass No (e.g. GP-89412 or comma-separated: GP-01, GP-02)"
                      value={modalGatePassNo}
                      onChange={(e) => setModalGatePassNo(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 text-xs font-bold uppercase rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 text-gray-900"
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block">
                    Official security gate pass number logged at plant dispatch
                  </span>
                </div>

                {/* Side-by-Side Planned vs Actual Cargo Grid */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-700 tracking-wider">
                    <span>Cargo Verification (System vs Physical)</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">editable inputs below</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Boxes */}
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Boxes (Ctns)</span>
                      <div className="text-[11px] text-gray-600">
                        Planned: <strong>{plannedBoxesVal}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-indigo-700 font-semibold block">Actual:</span>
                        <input
                          type="number"
                          value={actualBoxes}
                          onChange={(e) => setActualBoxes(e.target.value)}
                          className="w-full text-center text-xs font-bold bg-white border border-gray-300 rounded-md px-2 py-1 tabular-nums focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-[10px] font-bold tabular-nums">
                        {diffBoxes === 0 ? (
                          <span className="text-emerald-600">Match (0)</span>
                        ) : (
                          <span className="text-amber-700">{diffBoxes > 0 ? `+${diffBoxes}` : diffBoxes} bxs</span>
                        )}
                      </div>
                    </div>

                    {/* Weight KG */}
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Weight (KG)</span>
                      <div className="text-[11px] text-gray-600">
                        Planned: <strong>{formatNumber(plannedKgVal, 1)}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-indigo-700 font-semibold block">Actual:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={actualKg}
                          onChange={(e) => setActualKg(e.target.value)}
                          className="w-full text-center text-xs font-bold bg-white border border-gray-300 rounded-md px-2 py-1 tabular-nums focus:ring-1 focus:ring-indigo-500 text-indigo-950"
                        />
                      </div>
                      <div className="text-[10px] font-bold tabular-nums">
                        {Math.abs(diffKg) < 0.1 ? (
                          <span className="text-emerald-600">Match (0.0)</span>
                        ) : (
                          <span className={Math.abs(diffKg) > 10 ? "text-rose-600" : "text-amber-700"}>
                            {diffKg > 0 ? `+${diffKg.toFixed(1)}` : diffKg.toFixed(1)} kg
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Volume CBM */}
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Volume (CBM)</span>
                      <div className="text-[11px] text-gray-600">
                        Planned: <strong>{formatNumber(plannedCbmVal, 2)}</strong>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-indigo-700 font-semibold block">Actual:</span>
                        <input
                          type="number"
                          step="0.01"
                          value={actualCbm}
                          onChange={(e) => setActualCbm(e.target.value)}
                          className="w-full text-center text-xs font-bold bg-white border border-gray-300 rounded-md px-2 py-1 tabular-nums focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-[10px] font-bold tabular-nums">
                        {Math.abs(diffCbm) < 0.01 ? (
                          <span className="text-emerald-600">Match (0.00)</span>
                        ) : (
                          <span className="text-amber-700">{diffCbm > 0 ? `+${diffCbm.toFixed(2)}` : diffCbm.toFixed(2)} cbm</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variance Alert Banner */}
                {(Math.abs(diffKg) >= 0.5 || diffBoxes !== 0) && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Cargo Variance Detected:</span>
                    </div>
                    <span className="font-bold tabular-nums">
                      {diffKg !== 0 && `Weight: ${diffKg > 0 ? `+${diffKg.toFixed(1)}` : diffKg.toFixed(1)} kg `}
                      {diffBoxes !== 0 && `(${diffBoxes > 0 ? `+${diffBoxes}` : diffBoxes} bxs)`}
                    </span>
                  </div>
                )}

                {/* Auditor Verification Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Auditor Verification Status <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={auditorVerification}
                    onChange={(e) => setAuditorVerification(e.target.value as any)}
                    className="w-full h-9 px-3 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="VERIFIED">✅ Verified &amp; Approved (Within Tolerance / Clean Match)</option>
                    <option value="DISCREPANCY_FLAGGED">⚠️ Discrepancy Flagged (Variance Audit Required)</option>
                  </select>
                </div>

                {/* Variance Remarks * */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Auditor Verification / Variance Remarks <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={overrideRemarks}
                    onChange={(e) => setOverrideRemarks(e.target.value)}
                    placeholder="Explain the physical verification findings, reasons for cargo weight variance, or security confirmation..."
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setOverrideModal(null)}
                    disabled={isOverriding}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!overrideRemarks.trim() || isOverriding}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isOverriding ? "Saving..." : "Save & Reconcile Trip"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

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

              <label className="flex items-start gap-2.5 p-3 bg-amber-50/80 border border-amber-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={finalizeConfirmed}
                  onChange={(e) => setFinalizeConfirmed(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-amber-900 leading-tight">
                  <strong>Permanent Audit Action:</strong> I confirm that physical cargo and Commercial Invoices have been fully reconciled. I understand that finalizing locks this trip into financial accounting and cannot be undone.
                </span>
              </label>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setFinalizeModalTrip(null);
                    setFinalizeConfirmed(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isFinalizing || !finalizeConfirmed}
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
