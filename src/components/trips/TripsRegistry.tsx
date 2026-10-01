"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Search,
  User,
  Layers,
  CheckCircle2,
  Calendar,
  Gauge,
  X,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/utils";
import * as XLSX from "xlsx";

interface TripItem {
  id: number;
  tripNo: string;
  status: string;
  plannedKm: number | string | null;
  actualKm: number | string | null;
  varianceKm?: number | string | null;
  varianceReason?: string | null;
  totalTripCost: number | string | null;
  createdAt: string | Date;
  vehicle: {
    id: number;
    vehicleNumber: string;
    vehicleType: string;
  } | null;
  driver: {
    id: number;
    name: string;
    mobile: string;
  } | null;
  route: {
    id: number;
    routeName: string;
    routeCode: string;
  } | null;
  gatePasses?: Array<{
    id: number;
    gatePassNo: string;
    status?: string | null;
  }>;
  tripRequests: Array<{
    loadingSequence?: number | null;
    request: {
      id: number;
      requestCode: string;
      plant?: { code: string } | null;
      fromLocation?: { locationName: string } | null;
      toLocation?: { locationName: string } | null;
      requiredKg?: number | string | null;
      requiredCbm?: number | string | null;
      boxCount?: number | null;
      invoiceNumbers?: string | null;
    };
  }>;
}

interface TripsRegistryProps {
  initialTrips: TripItem[];
  canEnterOdometer?: boolean;
}

export const TripsRegistry: React.FC<TripsRegistryProps> = ({
  initialTrips,
  canEnterOdometer = true,
}) => {
  const router = useRouter();
  const [trips, setTrips] = useState<TripItem[]>(initialTrips);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ALLOCATED" | "DISPATCHED" | "COMPLETED">("ALL");
  const [kmFilter, setKmFilter] = useState<"ALL" | "PENDING" | "LOGGED">("ALL");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("");
  const [maxRows, setMaxRows] = useState<number>(50);

  // KM Modal State
  const [kmModalOpen, setKmModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripItem | null>(null);
  const [actualKmInput, setActualKmInput] = useState<string>("");
  const [varianceReasonPreset, setVarianceReasonPreset] = useState<string>("");
  const [varianceReasonCustom, setVarianceReasonCustom] = useState<string>("");
  const [savingKm, setSavingKm] = useState(false);
  const [kmError, setKmError] = useState<string | null>(null);

  // Counts based on the 4-step workflow
  const countAllocated = useMemo(
    () => trips.filter((t) => ["ASSIGNED", "ALLOCATED"].includes(t.status)).length,
    [trips]
  );
  const countDispatched = useMemo(
    () =>
      trips.filter((t) =>
        ["DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT"].includes(t.status)
      ).length,
    [trips]
  );
  const countCompleted = useMemo(
    () =>
      trips.filter((t) =>
        ["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(t.status)
      ).length,
    [trips]
  );
  const countPendingKm = useMemo(
    () =>
      trips.filter(
        (t) =>
          ["DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT", "COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(
            t.status
          ) && (!t.actualKm || Number(t.actualKm) === 0)
      ).length,
    [trips]
  );

  const filterTabs = [
    { id: "ALL" as const, label: "All Trips", count: trips.length },
    { id: "ALLOCATED" as const, label: "Allocated", count: countAllocated },
    { id: "DISPATCHED" as const, label: "Dispatched", count: countDispatched },
    { id: "COMPLETED" as const, label: "Completed", count: countCompleted },
  ];

  // Date boundary check
  const isDateInRange = (dateStr: string | Date, range: string) => {
    if (!range) return true;
    const d = new Date(dateStr);
    const now = new Date();

    if (range === "today") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    }
    if (range === "this_week") {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      monday.setHours(0, 0, 0, 0);
      return d >= monday;
    }
    if (range === "last_week") {
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() + diffToMonday - 7);
      lastMonday.setHours(0, 0, 0, 0);

      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastMonday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);

      return d >= lastMonday && d <= lastSunday;
    }
    if (range === "this_month") {
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth()
      );
    }
    if (range === "last_month") {
      const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    }
    return true;
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        t.tripNo.toLowerCase().includes(query) ||
        (t.vehicle?.vehicleNumber || "").toLowerCase().includes(query) ||
        (t.driver?.name || "").toLowerCase().includes(query) ||
        (t.route?.routeName || "").toLowerCase().includes(query) ||
        (t.gatePasses && t.gatePasses.some((gp) => gp.gatePassNo.toLowerCase().includes(query))) ||
        t.tripRequests.some((tr) => tr.request.requestCode.toLowerCase().includes(query));

      let matchesStatus = true;
      if (statusFilter === "ALL") {
        matchesStatus = true;
      } else if (statusFilter === "ALLOCATED") {
        matchesStatus = ["ASSIGNED", "ALLOCATED"].includes(t.status);
      } else if (statusFilter === "DISPATCHED") {
        matchesStatus = ["DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT"].includes(t.status);
      } else if (statusFilter === "COMPLETED") {
        matchesStatus = ["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(t.status);
      }

      let matchesKm = true;
      const hasActualKm = Number(t.actualKm) > 0;
      if (kmFilter === "PENDING") {
        matchesKm = !hasActualKm;
      } else if (kmFilter === "LOGGED") {
        matchesKm = hasActualKm;
      }

      const matchesDate = isDateInRange(t.createdAt, dateRangeFilter);

      return matchesSearch && matchesStatus && matchesKm && matchesDate;
    });
  }, [trips, searchQuery, statusFilter, kmFilter, dateRangeFilter]);

  const visibleTrips = useMemo(() => {
    if (maxRows <= 0) return filteredTrips;
    return filteredTrips.slice(0, maxRows);
  }, [filteredTrips, maxRows]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setKmFilter("ALL");
    setDateRangeFilter("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "ALL" || kmFilter !== "ALL" || dateRangeFilter !== "";

  // Open KM Entry Modal
  const openKmModal = (trip: TripItem) => {
    setSelectedTrip(trip);
    setActualKmInput(trip.actualKm ? String(trip.actualKm) : "");
    const existingReason = trip.varianceReason || "";
    const knownPresets = [
      "Within Tolerance / Normal",
      "Driver Home Travel (Approved)",
      "Fuel Station Detour",
      "Traffic / Highway Detour",
      "Customer Bay Repositioning",
    ];
    if (knownPresets.includes(existingReason)) {
      setVarianceReasonPreset(existingReason);
      setVarianceReasonCustom("");
    } else if (existingReason) {
      setVarianceReasonPreset("Other");
      setVarianceReasonCustom(existingReason);
    } else {
      setVarianceReasonPreset("Within Tolerance / Normal");
      setVarianceReasonCustom("");
    }
    setKmError(null);
    setKmModalOpen(true);
  };

  // Save Actual KM
  const handleSaveKm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;

    const parsedKm = parseFloat(actualKmInput);
    if (isNaN(parsedKm) || parsedKm < 0) {
      setKmError("Please enter a valid actual distance in kilometers (0 or greater).");
      return;
    }

    const finalReason =
      varianceReasonPreset === "Other"
        ? varianceReasonCustom.trim()
        : varianceReasonPreset;

    setSavingKm(true);
    setKmError(null);

    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/odometer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualKm: parsedKm,
          varianceReason: finalReason || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update actual KM.");
      }

      // Update local state
      const planned = Number(selectedTrip.plannedKm || 0);
      const varKm = parsedKm - planned;

      setTrips((prev) =>
        prev.map((t) => {
          if (t.id === selectedTrip.id) {
            return {
              ...t,
              actualKm: parsedKm,
              varianceKm: varKm,
              varianceReason: finalReason,
            };
          }
          return t;
        })
      );

      setKmModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setKmError(err.message || "An error occurred while saving.");
    } finally {
      setSavingKm(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredTrips.map((t) => {
      const planned = Number(t.plannedKm || 0);
      const actual = Number(t.actualKm || 0);
      const variance = t.actualKm ? actual - planned : "";
      return {
        "Trip Number": t.tripNo,
        "Created Date": new Date(t.createdAt).toISOString().slice(0, 10),
        "Status": t.status,
        "Vehicle Number": t.vehicle?.vehicleNumber || "-",
        "Driver Name": t.driver?.name || "-",
        "Driver Mobile": t.driver?.mobile || "-",
        "Route Corridor": t.route?.routeName || "-",
        "Cargo Requests": t.tripRequests.length,
        "Planned Distance (KM)": planned,
        "Actual Distance (KM)": actual || "-",
        "Variance (KM)": variance !== "" ? Number(Number(variance).toFixed(1)) : "-",
        "Variance Reason": t.varianceReason || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DeliveryTrips");
    XLSX.writeFile(wb, `STR_Delivery_Trips_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Real-time variance calculation in modal
  const modalPlannedKm = Number(selectedTrip?.plannedKm || 0);
  const modalActualKm = parseFloat(actualKmInput);
  const modalVariance = !isNaN(modalActualKm) ? modalActualKm - modalPlannedKm : null;

  return (
    <div className="space-y-2.5 w-full min-w-0 pb-16 px-1 sm:px-3">
      {/* Slim Top Bar: KPI Summary & Action Buttons in a Single Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 shadow-2xs">
        {/* Slim KPI Cards in one line - Equal Widths */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Trips */}
          <div className="w-[185px] flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 shrink-0">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Total Trips
            </span>
            <span className="text-sm font-bold text-gray-900 tabular-nums">
              {trips.length}
            </span>
          </div>

          {/* Allocated / Planning */}
          <div className="w-[185px] flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/80 shrink-0">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
              Allocated / Planning
            </span>
            <span className="text-sm font-bold text-indigo-700 tabular-nums">
              {countAllocated}
            </span>
          </div>

          {/* Dispatched / On Road */}
          <div className="w-[185px] flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50/70 border border-blue-200/80 shrink-0">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              Dispatched / On Road
            </span>
            <span className="text-sm font-bold text-blue-700 tabular-nums">
              {countDispatched}
            </span>
          </div>

          {/* Completed Trips */}
          <div className="w-[185px] flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 shrink-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">
                Completed
              </span>
              {countPendingKm > 0 && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shrink-0"
                  title="Trips waiting for running sheet actual KM"
                >
                  {countPendingKm}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-emerald-600 tabular-nums">
              {countCompleted}
            </span>
          </div>
        </div>

        {/* Action Buttons: Export Excel and Combine Workbench on the same line */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Export Excel</span>
          </button>

          <Link
            href="/allocations/fg/combine"
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>Combine Workbench</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
        {/* Top Filter Row: Search & Status Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search trip no, vehicle, driver, gate pass..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:border-indigo-600 bg-gray-50/50"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                    statusFilter === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Filter Row: KM Status Filter, Date Filter, Row Limiter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* KM Entry Status Filter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">KM Status:</span>
              <select
                value={kmFilter}
                onChange={(e) => setKmFilter(e.target.value as any)}
                className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All (KM Logged & Pending)</option>
                <option value="PENDING">⚠️ Needs KM (Pending)</option>
                <option value="LOGGED">✓ KM Logged (Entered)</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="h-8 text-rose-600 hover:text-rose-700 text-xs font-bold px-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Row Count Limiter */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-gray-500 whitespace-nowrap">Show:</span>
              <select
                value={maxRows}
                onChange={(e) => setMaxRows(Number(e.target.value))}
                className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={25}>25 trips</option>
                <option value={50}>50 trips</option>
                <option value={100}>100 trips</option>
                <option value={200}>200 trips</option>
                <option value={-1}>All records</option>
              </select>
            </div>

            <span className="h-8 inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 rounded-lg border border-slate-200 whitespace-nowrap">
              Showing {visibleTrips.length} of {filteredTrips.length}
            </span>
          </div>
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Trip Number</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Driver</th>
                <th className="py-2.5 px-3">Route Corridor</th>
                <th className="py-2.5 px-3 text-center">Requests</th>
                <th className="py-2.5 px-3 text-right">Planned (KM)</th>
                <th className="py-2.5 px-3 text-right">Actual (KM)</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTrips.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-gray-400">
                    No trips match the selected criteria.
                  </td>
                </tr>
              ) : (
                visibleTrips.map((t) => {
                  const totalBoxes = t.tripRequests.reduce(
                    (sum, tr) => sum + (Number(tr.request.boxCount) || 0),
                    0
                  );

                  const plannedKmVal = Number(t.plannedKm || 0);
                  const hasActualKm = Number(t.actualKm) > 0;
                  const actualKmVal = Number(t.actualKm || 0);
                  const varianceVal = hasActualKm ? actualKmVal - plannedKmVal : null;

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Trip Number */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg tracking-tight inline-block">
                            {t.tripNo}
                          </span>
                          {t.gatePasses && t.gatePasses.length > 0 && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums shrink-0"
                              title={`Gate Pass: ${t.gatePasses.map((g) => g.gatePassNo).join(", ")}`}
                            >
                              GP: {t.gatePasses[0].gatePassNo}
                              {t.gatePasses.length > 1 && ` (+${t.gatePasses.length - 1})`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date (Separate dedicated column) */}
                      <td className="py-2.5 px-3 text-xs text-gray-600 font-medium tabular-nums whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString("en-GB")}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>

                      {/* Vehicle */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 text-xs">
                          <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{t.vehicle?.vehicleNumber || "Unassigned"}</span>
                          {t.vehicle?.vehicleType && (
                            <span className="text-[10px] font-normal text-gray-500">
                              ({t.vehicle.vehicleType})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Driver */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-800 text-xs">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium">{t.driver?.name || "Unassigned"}</span>
                          {t.driver?.mobile && (
                            <span className="text-[11px] text-gray-400 tabular-nums">
                              · {t.driver.mobile}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Route Corridor (Extended width) */}
                      <td className="py-2.5 px-3 min-w-[200px] max-w-[340px] lg:max-w-[420px]">
                        <span
                          className="truncate font-medium text-gray-800 text-xs block"
                          title={t.route?.routeName || "Consolidated Multi-Stop Corridor"}
                        >
                          {t.route?.routeName || "Consolidated Multi-Stop Corridor"}
                        </span>
                      </td>

                      {/* Requests Cargo */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
                          {t.tripRequests.length} cargo
                        </span>
                        {totalBoxes > 0 && (
                          <span className="ml-1.5 text-[11px] text-gray-500 tabular-nums">
                            ({totalBoxes} bxs)
                          </span>
                        )}
                      </td>

                      {/* Planned KM */}
                      <td className="py-2.5 px-3 text-right text-xs text-gray-700 font-medium tabular-nums whitespace-nowrap">
                        {formatNumber(plannedKmVal, 1)} KM
                      </td>

                      {/* Actual KM */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap tabular-nums">
                        {hasActualKm ? (
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <span className="font-bold text-gray-900 text-xs">
                              {formatNumber(actualKmVal, 1)} KM
                            </span>
                            {varianceVal !== null && (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  varianceVal > 10
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : varianceVal >= 0
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-blue-100 text-blue-800 border border-blue-300"
                                }`}
                                title={t.varianceReason ? `Reason: ${t.varianceReason}` : "Distance variance"}
                              >
                                {varianceVal >= 0 ? `+${varianceVal.toFixed(1)}` : varianceVal.toFixed(1)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-semibold">
                            ⚠️ Pending
                          </span>
                        )}
                      </td>

                      {/* Action (Compact Icon) */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Enter / Edit KM Icon Button */}
                          {canEnterOdometer &&
                            ["DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT", "COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(
                              t.status
                            ) && (
                              <button
                                type="button"
                                onClick={() => openKmModal(t)}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all shadow-2xs cursor-pointer ${
                                  hasActualKm
                                    ? "bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200"
                                    : "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                                }`}
                                title={
                                  hasActualKm
                                    ? `Edit Logged KM (${formatNumber(actualKmVal, 1)} KM)`
                                    : "Enter Actual KM from Running Sheet"
                                }
                              >
                                <Gauge className="w-3.5 h-3.5" />
                              </button>
                            )}

                          {/* Completed Indicator */}
                          {["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(t.status) && hasActualKm && (
                            <span
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200"
                              title="Trip Completed & Verified"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
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

      {/* Modal: Enter Actual KM / Running Sheet */}
      {kmModalOpen && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight">
                    Record Actual KM — {selectedTrip.tripNo}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Driver Running Sheet &amp; Odometer Reconciliation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKmModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveKm} className="p-4 space-y-3.5 text-xs">
              {/* Trip Metadata Box */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="text-gray-500 font-medium">Vehicle Number:</span>
                  <strong className="text-gray-900">{selectedTrip.vehicle?.vehicleNumber || "Unassigned"}</strong>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="text-gray-500 font-medium">Driver:</span>
                  <strong>{selectedTrip.driver?.name || "Unassigned"}</strong>
                </div>
                <div className="flex justify-between items-center text-gray-700">
                  <span className="text-gray-500 font-medium">Planned Distance:</span>
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                    {formatNumber(Number(selectedTrip.plannedKm || 0), 1)} KM
                  </span>
                </div>
              </div>

              {/* Actual KM Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-800">
                  Actual Distance Driven (KM) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    placeholder="Enter total actual km from running sheet"
                    value={actualKmInput}
                    onChange={(e) => setActualKmInput(e.target.value)}
                    className="w-full h-10 px-3 text-sm font-bold text-gray-900 rounded-lg border border-gray-300 focus:outline-hidden focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                    KM
                  </span>
                </div>
              </div>

              {/* Real-time Variance Preview */}
              {modalVariance !== null && (
                <div
                  className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                    modalVariance > 10
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : modalVariance >= 0
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-blue-50 border-blue-300 text-blue-900"
                  }`}
                >
                  <span className="font-medium">Variance (Actual − Planned):</span>
                  <span className="font-bold text-sm tabular-nums">
                    {modalVariance >= 0 ? `+${modalVariance.toFixed(1)}` : modalVariance.toFixed(1)} KM
                    {modalVariance > 10 && <span className="text-[10px] ml-1 font-semibold">(Deviation &gt; 10km)</span>}
                  </span>
                </div>
              )}

              {/* Variance Reason Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Variance Reason / Notes (Optional)
                </label>
                <select
                  value={varianceReasonPreset}
                  onChange={(e) => setVarianceReasonPreset(e.target.value)}
                  className="w-full h-9 px-2.5 text-xs rounded-lg border border-gray-300 focus:outline-hidden focus:border-indigo-600 bg-white"
                >
                  <option value="Within Tolerance / Normal">Within Tolerance / Normal</option>
                  <option value="Driver Home Travel (Approved)">Driver Home Travel (Approved)</option>
                  <option value="Fuel Station Detour">Fuel Station Detour</option>
                  <option value="Traffic / Highway Detour">Traffic / Highway Detour</option>
                  <option value="Customer Bay Repositioning">Customer Bay Repositioning</option>
                  <option value="Other">Other / Custom Reason</option>
                </select>

                {varianceReasonPreset === "Other" && (
                  <input
                    type="text"
                    placeholder="Specify reason (e.g. detour details)"
                    value={varianceReasonCustom}
                    onChange={(e) => setVarianceReasonCustom(e.target.value)}
                    className="w-full h-8 px-2.5 mt-1 text-xs rounded-lg border border-gray-300 focus:outline-hidden focus:border-indigo-600 bg-white"
                  />
                )}
              </div>

              {/* Error Alert */}
              {kmError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{kmError}</span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setKmModalOpen(false)}
                  disabled={savingKm}
                  className="h-8 px-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingKm}
                  className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {savingKm ? "Saving..." : "Save Actual KM"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
