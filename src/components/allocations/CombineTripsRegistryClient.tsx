"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Combine,
  Search,
  RotateCcw,
  FileSpreadsheet,
  PlusCircle,
  Eye,
  CheckCircle2,
  Trash2,
  Truck,
  RotateCcw as UndoIcon,
  KeyRound,
  FileCheck2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface CombineTripsRegistryClientProps {
  initialTrips: any[];
  vehicles: any[];
  drivers: any[];
  routes: any[];
}

export function CombineTripsRegistryClient({
  initialTrips,
  vehicles,
  drivers,
  routes,
}: CombineTripsRegistryClientProps) {
  const router = useRouter();

  // Filters State (default to All Statuses and All Dates to display imported trips)
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedDateRange, setSelectedDateRange] = useState("");

  // Active Trips List State (allows instant in-memory updates)
  const [tripsList, setTripsList] = useState(initialTrips);
  React.useEffect(() => {
    setTripsList(initialTrips);
  }, [initialTrips]);

  // Complete Trip Confirmation Modal State
  const [completeModalTrip, setCompleteModalTrip] = useState<any | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Selection for Excel export
  const [selectedTripIds, setSelectedTripIds] = useState<number[]>([]);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [modalVehicleId, setModalVehicleId] = useState("");
  const [modalDriverId, setModalDriverId] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Date Filtering Logic
  const filterByDate = (dateStr: string | Date, range: string): boolean => {
    if (!range) return true;
    const reqDate = new Date(dateStr);
    const now = new Date();

    const todayStr = now.toISOString().slice(0, 10);
    const reqDateStr = reqDate.toISOString().slice(0, 10);

    if (range === "today") return reqDateStr === todayStr;

    const dayOfWeek = now.getDay() || 7;
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
    thisWeekStart.setHours(0, 0, 0, 0);

    if (range === "this_week") return reqDate >= thisWeekStart && reqDate <= now;

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    if (range === "last_week") return reqDate >= lastWeekStart && reqDate <= lastWeekEnd;

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === "this_month") return reqDate >= thisMonthStart && reqDate <= now;

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    if (range === "last_month") return reqDate >= lastMonthStart && reqDate <= lastMonthEnd;

    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    if (range === "this_year") return reqDate >= thisYearStart && reqDate <= now;

    return true;
  };

  // Filtered Trips
  const filteredTrips = useMemo(() => {
    return tripsList.filter((t) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const tripNo = (t.tripNo || "").toLowerCase();
        const routeName = (t.route?.routeName || t.route?.routeCode || "Custom Route").toLowerCase();
        const veh = (t.vehicle?.vehicleNumber || "").toLowerCase();
        const driver = (t.driver?.name || "").toLowerCase();

        if (
          !tripNo.includes(q) &&
          !routeName.includes(q) &&
          !veh.includes(q) &&
          !driver.includes(q)
        ) {
          return false;
        }
      }

      // 2. Status Filter
      if (selectedStatus) {
        const tripStatus = (t.status || "").toUpperCase();
        if (selectedStatus === "pending") {
          if (["COMPLETED", "CANCELLED", "RECONCILED", "FINALIZED", "CLOSED"].includes(tripStatus)) return false;
        } else if (selectedStatus === "completed") {
          if (!["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(tripStatus)) return false;
        }
      }

      // 3. Date Range Filter
      if (selectedDateRange) {
        if (!filterByDate(t.createdAt, selectedDateRange)) {
          return false;
        }
      }

      return true;
    });
  }, [tripsList, search, selectedStatus, selectedDateRange]);

  const hasActiveFilters =
    search !== "" || selectedStatus !== "pending" || selectedDateRange !== "";

  const resetFilters = () => {
    setSearch("");
    setSelectedStatus("pending");
    setSelectedDateRange("");
  };

  // Excel Export
  const handleExportExcel = () => {
    const targetData =
      selectedTripIds.length > 0
        ? filteredTrips.filter((t) => selectedTripIds.includes(t.id))
        : filteredTrips;

    const rows = targetData.map((t) => {
      const requestsCount = t.tripRequests?.length || 0;
      const totalBoxes = t.tripRequests?.reduce((s: number, tr: any) => s + (tr.request?.boxCount || 0), 0) || 0;
      const totalKg = t.tripRequests?.reduce((s: number, tr: any) => s + (Number(tr.request?.requiredKg) || 0), 0) || 0;
      const totalCbm = t.tripRequests?.reduce((s: number, tr: any) => s + (Number(tr.request?.requiredCbm) || 0), 0) || 0;
      const maxKg = Number(t.vehicle?.maxPayloadKg) || 0;
      const maxCbm = Number(t.vehicle?.maxVolumeCbm) || 20;
      const utilPct = maxCbm > 0 ? Math.min(100, Math.round((totalCbm / maxCbm) * 100)) : 0;

      return {
        "Allocation No": t.tripNo,
        "Date": new Date(t.createdAt).toISOString().slice(0, 10),
        "Time": new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        "Route": t.route?.routeName || "Custom Corridor Route",
        "KM": Number(t.plannedKm || 0),
        "Vehicle": t.vehicle?.vehicleNumber || "-",
        "Driver": t.driver?.name || "-",
        "Requests": requestsCount,
        "Boxes": totalBoxes,
        "Load (KG)": totalKg,
        "Max (KG)": maxKg,
        "Load (CBM)": totalCbm,
        "Max (CBM)": maxCbm,
        "Util %": `${utilPct}%`,
        "Status": t.status,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CombineTrips");
    XLSX.writeFile(wb, `STR_Combine_Trips_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };


  // Reverse / Discard Trip
  
  const handleConfirmComplete = async () => {
    if (!completeModalTrip) return;
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/trips/${completeModalTrip.id}/complete`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTripsList((prev) =>
          prev.map((t) => (t.id === completeModalTrip.id ? { ...t, status: "COMPLETED" } : t))
        );
        setToastMessage(`Trip #${completeModalTrip.tripNo} marked as COMPLETED. Fleet released to AVAILABLE.`);
        setCompleteModalTrip(null);
        setTimeout(() => setToastMessage(""), 5000);
        router.refresh();
      } else {
        alert(data.message || "Failed to complete trip.");
      }
    } catch (err: any) {
      alert(err.message || "Network error.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReverseTrip = async (tripId: number, tripNo: string) => {
    if (
      !confirm(
        `Are you sure you want to REVERSE Trip ${tripNo}? All linked requests will be reverted to SUBMITTED status and vehicle/driver will be released.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/allocations/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reverse", tripId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.refresh();
      } else {
        alert(data.error || data.message || "Failed to reverse trip.");
      }
    } catch (e: any) {
      alert(e.message || "Operation failed.");
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setModalVehicleId("");
    setModalDriverId("");
    setModalRemarks("");
    setCreateModalOpen(true);
  };

  // Handle vehicle change with auto-driver selection
  const handleVehicleChange = (vId: string) => {
    setModalVehicleId(vId);
    if (vId) {
      const linked = drivers.find((d: any) => Number(d.linkedVehicleId) === Number(vId));
      if (linked) {
        setModalDriverId(String(linked.id));
      }
    }
  };

  const isDriverAutoSelected = useMemo(() => {
    if (!modalVehicleId || !modalDriverId) return false;
    const linked = drivers.find((d: any) => Number(d.linkedVehicleId) === Number(modalVehicleId));
    return linked ? String(linked.id) === String(modalDriverId) : false;
  }, [modalVehicleId, modalDriverId, drivers]);

  // Create Empty Trip
  const handleCreateCombine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalVehicleId || !modalDriverId) {
      alert("Please select vehicle and driver.");
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await fetch("/api/allocations/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-empty",
          vehicleId: modalVehicleId,
          driverId: modalDriverId,
          adminRemarks: modalRemarks,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success && json.trip?.id) {
        setCreateModalOpen(false);
        router.push(`/allocations/fg/combine/${json.trip.id}`);
      } else {
        alert(json.message || "Failed to create combine trip.");
      }
    } catch (err: any) {
      alert(err.message || "Network error.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2.5 w-full">
      {/* Top Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-52 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Trip No, Route, Vehicle..."
              className="w-full h-8 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Filter Dropdowns Grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending (Assigned/Started)</option>
              <option value="completed">Completed</option>
            </select>

            {/* Date Range Filter */}
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Dates</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
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

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0 justify-end w-full sm:w-auto pt-1 sm:pt-0">
          <span className="h-8 inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 rounded-lg border border-slate-200 whitespace-nowrap">
            <span className="hidden xs:inline">Total:&nbsp;</span>{filteredTrips.length}<span className="hidden xs:inline">&nbsp;Allocations</span><span className="xs:hidden">&nbsp;Allocs</span>
          </span>

          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 inline-flex items-center gap-1 px-2 sm:px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Export to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Create Combine Trip</span>
            <span className="xs:hidden">New Combine</span>
          </button>
        </div>
      </div>

      {/* Sticky Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-200 border-b border-slate-300">
              <tr className="text-[10.5px] uppercase tracking-wider text-slate-800 font-bold">
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[125px]">ALLOCATION NO</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">DATE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">TIME</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[360px] max-w-[520px]">ROUTE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">KM</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[120px]">VEHICLE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[140px]">DRIVER</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">REQUESTS</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">BOXES</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">LOAD (KG)</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">MAX (KG)</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">LOAD (CBM)</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">MAX (CBM)</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">UTIL %</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">STATUS</th>
                <th className="px-2.5 py-1.5 pr-3 text-right whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No combine trips found.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Create a new combine trip to group cargo requests.</p>
                  </td>
                </tr>
              ) : (
                filteredTrips.map((trip) => {
                  const reqCount = trip.tripRequests?.length || 0;
                  const totalBoxes = trip.tripRequests?.reduce(
                    (s: number, tr: any) => s + (tr.request?.boxCount || 0),
                    0
                  ) || 0;
                  const totalKg = trip.tripRequests?.reduce(
                    (s: number, tr: any) => s + (Number(tr.request?.requiredKg) || 0),
                    0
                  ) || 0;
                  const totalCbm = trip.tripRequests?.reduce(
                    (s: number, tr: any) => s + (Number(tr.request?.requiredCbm) || 0),
                    0
                  ) || 0;

                  const maxKg = Number(trip.vehicle?.maxPayloadKg) || 0;
                  const maxCbm = Number(trip.vehicle?.maxVolumeCbm) || 20;
                  const utilPct = maxCbm > 0 ? Math.min(100, Math.round((totalCbm / maxCbm) * 100)) : 0;

                  const utilBadgeClass =
                    utilPct > 90
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : utilPct >= 50
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                  const km = Number(trip.plannedKm || 0);

                  return (
                    <tr
                      key={trip.id}
                      onClick={() => router.push(`/allocations/fg/combine/${trip.id}`)}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 cursor-pointer"
                    >
                      {/* Allocation No */}
                      <td className="px-2.5 py-1.5 font-bold text-blue-600 border-r border-slate-100 whitespace-nowrap min-w-[125px]">
                        <Link
                          href={`/allocations/fg/combine/${trip.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {trip.tripNo}
                        </Link>
                      </td>

                      {/* Date */}
                      <td className="px-2.5 py-1.5 tabular-nums text-slate-700 whitespace-nowrap border-r border-slate-100">
                        {new Date(trip.createdAt).toISOString().slice(0, 10)}
                      </td>

                      {/* Time */}
                      <td className="px-2.5 py-1.5 tabular-nums text-slate-500 whitespace-nowrap border-r border-slate-100 text-[10.5px]">
                        {new Date(trip.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      {/* Route */}
                      <td
                        className="px-2.5 py-1.5 font-medium text-slate-800 border-r border-slate-100 min-w-[360px] max-w-[520px] truncate"
                        title={trip.route?.routeName || "Custom Route"}
                      >
                        <span className="font-semibold text-slate-800">
                          {trip.route?.routeName || "Custom Route"}
                        </span>
                      </td>

                      {/* KM */}
                      <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {km > 0 ? `${km.toFixed(1)} km` : "-"}
                      </td>

                      {/* Vehicle */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-800 whitespace-nowrap border-r border-slate-100 min-w-[120px] truncate" title={trip.vehicle?.vehicleNumber || ""}>
                        {trip.vehicle?.vehicleNumber || "-"}
                      </td>

                      {/* Driver */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-800 whitespace-nowrap border-r border-slate-100 min-w-[140px] truncate" title={trip.driver?.name || ""}>
                        {trip.driver?.name || "-"}
                      </td>

                      {/* Requests Count */}
                      <td className="px-2.5 py-1.5 font-bold text-center border-r border-slate-100 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-xs tabular-nums font-semibold">
                          {reqCount}
                        </span>
                      </td>

                      {/* Boxes */}
                      <td className="px-2.5 py-1.5 font-semibold text-center border-r border-slate-100 whitespace-nowrap text-slate-700 tabular-nums">
                        {totalBoxes > 0 ? totalBoxes : "-"}
                      </td>

                      {/* Load (KG) */}
                      <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                        {totalKg > 0 ? totalKg.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "-"}
                      </td>

                      {/* Max (KG) */}
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-500 border-r border-slate-100 whitespace-nowrap font-medium">
                        {maxKg > 0 ? maxKg.toLocaleString() : "-"}
                      </td>

                      {/* Load (CBM) */}
                      <td className="px-2.5 py-1.5 text-right tabular-nums font-semibold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                        {totalCbm > 0 ? totalCbm.toFixed(2) : "-"}
                      </td>

                      {/* Max (CBM) */}
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-500 border-r border-slate-100 whitespace-nowrap font-medium">
                        {maxCbm > 0 ? maxCbm.toFixed(1) : "-"}
                      </td>

                      {/* Util % */}
                      <td className="px-2.5 py-1.5 text-center border-r border-slate-100 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9.5px] font-bold border ${utilBadgeClass}`}>
                          {utilPct}%
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-100">
                        <StatusBadge status={trip.status} />
                      </td>

                      {/* Actions */}
                      <td
                        className="px-2.5 py-1.5 pr-3 whitespace-nowrap text-right font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-1.5">
                          {!["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"].includes(trip.status) ? (
                            <button
                              type="button"
                              onClick={() => setCompleteModalTrip(trip)}
                              className="text-emerald-600 hover:text-emerald-800 p-1 rounded-md hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="⚡️ Complete Trip (Marks COMPLETED & Frees Fleet to AVAILABLE)"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 font-bold" />
                            </button>
                          ) : (
                            <span
                              title={`Trip is ${trip.status} (Completed)`}
                              className="p-1 opacity-70 cursor-default inline-flex items-center"
                            >
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            </span>
                          )}

                          <Link
                            href={`/allocations/fg/combine/${trip.id}`}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Open Combine Workbench"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED", "DISPATCHED", "IN_TRANSIT"].includes(trip.status) && (
                            <Link
                              href="/reconciliation"
                              className="text-emerald-600 hover:text-emerald-800 p-1 rounded hover:bg-emerald-50 transition-colors"
                              title="Go to Reconciliation"
                            >
                              <FileCheck2 className="w-4 h-4" />
                            </Link>
                          )}

                          {trip.status === "ASSIGNED" && (
                            <button
                              type="button"
                              onClick={() => handleReverseTrip(trip.id, trip.tripNo)}
                              className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Reverse & Discard Trip"
                            >
                              <UndoIcon className="w-4 h-4" />
                            </button>
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

      {/* Create Combine Trip Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/60 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Combine className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">Create New Combine Trip</h3>
                  <p className="text-[11px] text-slate-500">
                    Initialize vehicle &amp; driver to start grouping requests
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCombine} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={modalVehicleId}
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Select Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Driver <span className="text-rose-500">*</span>
                    </label>
                    {isDriverAutoSelected && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Auto-assigned
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={modalDriverId}
                    onChange={(e) => setModalDriverId(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.mobile || "N/A"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Admin Remarks
                </label>
                <input
                  type="text"
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  placeholder="Optional notes for this combine trip..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingCreate ? "Creating..." : "Initialize Combine Trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Complete Confirmation Modal */}
      {completeModalTrip && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            <div className="px-5 py-4 bg-emerald-50/80 border-b border-emerald-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Complete Trip & Release Fleet
                </h3>
                <p className="text-[11px] text-emerald-800 font-semibold">
                  Trip No: {completeModalTrip.tripNo}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs text-slate-600">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Vehicle:</span>
                  <span className="font-bold text-slate-800">{completeModalTrip.vehicle?.vehicleNumber || "Unassigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Driver:</span>
                  <span className="font-bold text-slate-800">{completeModalTrip.driver?.name || "Unassigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Linked Requests:</span>
                  <span className="font-bold text-slate-800">{completeModalTrip.tripRequests?.length || 0} Requests</span>
                </div>
              </div>

              <p className="leading-relaxed text-slate-700">
                Are you sure you want to mark this trip as <strong>COMPLETED</strong>?
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-0.5">
                <li>Linked requests will be permanently locked against modifications.</li>
                <li>Assigned Vehicle & Driver will be immediately released to <strong>AVAILABLE</strong> for new dispatches.</li>
                <li>This trip will be queued for Datatex ERP Reconciliation.</li>
              </ul>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCompleteModalTrip(null)}
                disabled={isCompleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={isCompleting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleting ? "Completing..." : "Confirm Complete (Release Fleet)"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 text-xs font-bold transition-all animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
