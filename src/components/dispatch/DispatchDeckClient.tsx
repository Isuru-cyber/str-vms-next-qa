"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  CheckCircle2,
  Clock,
  Search,
  Truck,
  User,
  MapPin,
  ArrowRight,
  FileCheck2,
  Package,
  FileSpreadsheet,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import * as XLSX from "xlsx";

interface DispatchDeckClientProps {
  initialTrips: any[];
}

export function DispatchDeckClient({ initialTrips }: DispatchDeckClientProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>(initialTrips);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [gatePassModal, setGatePassModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);
  const [gatePassInputs, setGatePassInputs] = useState<Record<number, string>>({});
  const [gatePassRemarks, setGatePassRemarks] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // Filter trips by tab
  const pendingTrips = trips.filter(
    (t) =>
      t.status === "READY_FOR_LOADING" &&
      (!t.gatePasses || t.gatePasses.length === 0)
  );

  const completedTrips = trips.filter(
    (t) =>
      t.status === "GATE_PASS_ISSUED" ||
      (t.gatePasses && t.gatePasses.length > 0)
  );

  const currentTabTrips = activeTab === "pending" ? pendingTrips : completedTrips;

  const filteredTrips = currentTabTrips.filter((t) => {
    const q = searchQuery.toLowerCase();
    const tripNoMatch = (t.tripNo || "").toLowerCase().includes(q);
    const vehicleMatch = (t.vehicle?.vehicleNumber || "").toLowerCase().includes(q);
    const driverMatch = (t.driver?.name || "").toLowerCase().includes(q);
    const routeMatch = (t.route?.routeName || "").toLowerCase().includes(q);
    const reqMatch = (t.tripRequests || []).some(
      (tr: any) =>
        (tr.request?.requestCode || "").toLowerCase().includes(q) ||
        (tr.request?.toLocation?.locationName || "").toLowerCase().includes(q) ||
        (tr.request?.invoiceNumbers || "").toLowerCase().includes(q)
    );
    return tripNoMatch || vehicleMatch || driverMatch || routeMatch || reqMatch;
  });

  const openGatePassModal = (trip: any) => {
    setSelectedTrip(trip);
    const initialInputs: Record<number, string> = {};
    const initialRemarks: Record<number, string> = {};

    trip.tripRequests?.forEach((tr: any) => {
      const existing = trip.gatePasses?.filter((gp: any) => gp.requestId === tr.requestId);
      if (existing && existing.length > 0) {
        initialInputs[tr.requestId] = existing.map((e: any) => e.gatePassNo).join(", ");
        initialRemarks[tr.requestId] = existing[0]?.remarks || "";
      } else {
        initialInputs[tr.requestId] = "";
        initialRemarks[tr.requestId] = "";
      }
    });

    setGatePassInputs(initialInputs);
    setGatePassRemarks(initialRemarks);
    setGatePassModal(true);
  };

  const handleSaveGatePasses = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedTrip) return;
    setSaving(true);

    try {
      const payload = Object.entries(gatePassInputs).map(([reqId, val]) => ({
        requestId: parseInt(reqId, 10),
        gatePassNo: val,
        remarks: gatePassRemarks[parseInt(reqId, 10)] || null,
      }));

      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-gate-passes",
          tripId: selectedTrip.id,
          gatePasses: payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save gate passes");
      }

      // Update local state
      setTrips((prev) =>
        prev.map((t) => {
          if (t.id === selectedTrip.id) {
            const newGps: any[] = [];
            payload.forEach((p) => {
              const passNumbers = String(p.gatePassNo)
                .split(/[\r\n,]+/)
                .map((s) => s.trim())
                .filter(Boolean);
              passNumbers.forEach((no) => {
                newGps.push({
                  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}-${no}`,
                  tripId: t.id,
                  requestId: p.requestId,
                  gatePassNo: no,
                  remarks: p.remarks,
                  status: "ENTERED",
                });
              });
            });

            return {
              ...t,
              status: "GATE_PASS_ISSUED",
              gatePasses: newGps,
            };
          }
          return t;
        })
      );

      setGatePassModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error saving gate passes");
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredTrips.flatMap((trip) =>
      (trip.tripRequests || []).map((tr: any) => {
        const gps = (trip.gatePasses || [])
          .filter((gp: any) => gp.requestId === tr.request?.id)
          .map((gp: any) => gp.gatePassNo)
          .join(", ");

        return {
          "Trip No": trip.tripNo,
          "Trip Status": trip.status,
          "Vehicle": trip.vehicle?.vehicleNumber || "-",
          "Driver": trip.driver?.name || "-",
          "Route Corridor": trip.route?.routeName || "-",
          "Request Code": tr.request?.requestCode || "-",
          "Customer / Bay": tr.request?.toLocation?.locationName || "-",
          "Plant": tr.request?.plant?.code || "-",
          "Weight (KG)": Number(tr.request?.requiredKg) || 0,
          "Box Count": tr.request?.boxCount || 0,
          "Commercial Invoices": tr.request?.invoiceNumbers || "-",
          "Gate Pass Numbers": gps || (trip.gatePasses || []).map((g: any) => g.gatePassNo).join(", ") || "-",
        };
      })
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DispatchDeck");
    XLSX.writeFile(wb, `STR_Dispatch_Deck_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4 w-full max-w-[1600px] mx-auto pb-24 px-2 sm:px-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Truck className="w-5 h-5 text-indigo-600" />
            <span>FG Dispatch Deck</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Loading Bay Gate Pass Entry &bull; Record physical security gate passes before dispatch to Reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden xs:inline">Export Excel</span>
            <span className="xs:hidden">Excel</span>
          </button>

          <Link
            href="/reconciliation"
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden xs:inline">Open Reconciliation</span>
            <span className="xs:hidden">Reconcile</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Dispatches
          </span>
          <p className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">{trips.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending Gate Pass
          </span>
          <p className="text-xl font-bold text-amber-600 tabular-nums mt-0.5">{pendingTrips.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Gate Pass Completed
          </span>
          <p className="text-xl font-bold text-emerald-600 tabular-nums mt-0.5">{completedTrips.length}</p>
        </div>
      </div>

      {/* Filter & Tabs Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Tabs Switcher */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`h-8 px-3 rounded-md font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pending Gate Pass ({pendingTrips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`h-8 px-3 rounded-md font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "completed"
                ? "bg-white text-emerald-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Dispatched / Completed ({completedTrips.length})</span>
          </button>
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trip, vehicle, driver, customer..."
            className="w-full h-8 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Trip Cards Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 shadow-2xs">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-700 text-sm">
            No {activeTab === "pending" ? "pending" : "completed"} dispatch trips found.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === "pending"
              ? "All allocated cargo has been issued gate passes."
              : "No gate pass dispatches recorded yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTrips.map((trip) => {
            const reqs = trip.tripRequests || [];
            const gatePasses = trip.gatePasses || [];
            const hasGps = gatePasses.length > 0;

            return (
              <div
                key={trip.id}
                className="bg-white rounded-xl border border-gray-200 shadow-xs p-4 sm:p-5 flex flex-col justify-between space-y-3 hover:border-indigo-200 transition-colors"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg tracking-tight">
                        {trip.tripNo}
                      </span>
                      <StatusBadge status={trip.status} />
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-900 block">
                        {trip.vehicle?.vehicleNumber || "Vehicle Unassigned"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {trip.vehicle?.vehicleType || "Commercial Fleet"}
                      </span>
                    </div>
                  </div>

                  {/* Driver & Corridor Details */}
                  <div className="mt-2.5 p-2.5 bg-gray-50/70 rounded-lg border border-gray-100 space-y-1 text-xs">
                    <div className="flex items-center gap-2 text-gray-700">
                      <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>
                        Driver: <strong className="text-gray-900">{trip.driver?.name || "Unassigned"}</strong>
                        {trip.driver?.mobile && (
                          <span className="text-gray-500 tabular-nums ml-1">({trip.driver.mobile})</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 truncate text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{trip.route?.routeName || "Multi-Stop Consolidated Corridor"}</span>
                    </div>
                  </div>

                  {/* Loading Cargo Sequence */}
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Cargo Loading Order ({reqs.length} Requests):
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {reqs.map((tr: any, idx: number) => {
                        const r = tr.request;
                        const reqGps = gatePasses.filter((g: any) => g.requestId === r?.id);

                        return (
                          <div
                            key={tr.requestId || idx}
                            className="p-2 rounded-lg border border-gray-200 bg-gray-50/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-bold text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </span>
                                <span className="font-bold text-indigo-700 tracking-tight">
                                  {r?.requestCode}
                                </span>
                                <span className="text-gray-700 truncate font-medium text-[11px]">
                                  &rarr; {r?.toLocation?.locationName || "-"}
                                </span>
                              </div>
                              <span className="text-gray-500 tabular-nums text-[11px] shrink-0 font-medium">
                                {r?.boxCount || 0} Bx ({Number(r?.requiredKg || 0)} kg)
                              </span>
                            </div>

                            {/* Gate Passes for this request */}
                            {reqGps.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-gray-100">
                                <span className="text-[10px] font-semibold text-emerald-700">Gate Passes:</span>
                                {reqGps.map((gp: any) => (
                                  <span
                                    key={gp.id}
                                    className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded"
                                  >
                                    {gp.gatePassNo}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-gray-500">
                    {hasGps ? (
                      <span className="font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {gatePasses.length} Gate Pass(es) Recorded
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Gate Pass Pending
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openGatePassModal(trip)}
                      className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                      <span>{hasGps ? "Edit Gate Pass(es)" : "Enter Gate Pass(es)"}</span>
                    </button>

                    {hasGps && (
                      <Link
                        href="/reconciliation"
                        className="h-8 inline-flex items-center gap-1 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors"
                        title="Proceed to Reconciliation"
                      >
                        <span>Reconcile</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multiple Gate Pass Entry Modal */}
      {gatePassModal && selectedTrip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>Enter Security Gate Passes &bull; {selectedTrip.tripNo}</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Record factory security gate passes. If a request has <b>multiple gate passes</b>, separate them with commas (e.g. <code>GP-9012, GP-9013</code>).
              </p>
            </div>

            <form onSubmit={handleSaveGatePasses} className="space-y-4">
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {(selectedTrip.tripRequests || []).map((tr: any) => {
                  const r = tr.request;
                  return (
                    <div key={r.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-indigo-700 tracking-tight">{r.requestCode}</span>
                        <span className="font-semibold text-gray-700 truncate">&rarr; {r.toLocation?.locationName}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Boxes: <strong>{r.boxCount || 0}</strong> | Weight: <strong>{Number(r.requiredKg || 0)} KG</strong>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                          Gate Pass Serial Number(s) <span className="text-indigo-600 font-normal">(comma-separated if multiple)</span>:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. GP-2026-9812, GP-2026-9813"
                          value={gatePassInputs[r.id] || ""}
                          onChange={(e) =>
                            setGatePassInputs({ ...gatePassInputs, [r.id]: e.target.value })
                          }
                          className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setGatePassModal(false)}
                  className="h-8 px-3.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving ? "Saving..." : "Save Gate Pass(es)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
