"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  RotateCcw,
  FileSpreadsheet,
  PlusCircle,
  Eye,
  ArrowUpRight,
  Truck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface RequestsRegistryClientProps {
  initialRequests: any[];
  plants: any[];
  operations: any[];
  currentUser?: any;
}

export function RequestsRegistryClient({
  initialRequests,
  plants,
  operations,
  currentUser,
}: RequestsRegistryClientProps) {
  // Filters State (default to showing all records)
  const [search, setSearch] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedOperation, setSelectedOperation] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState("this_week");

  // Selected row IDs for Excel export
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return initialRequests.filter((r) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const code = (r.requestCode || "").toLowerCase();
        const item = (r.itemDescription || "").toLowerCase();
        const inv = (r.invoiceNumbers || "").toLowerCase();
        const fromLoc = (r.fromLocation?.locationName || "").toLowerCase();
        const toLoc = (r.toLocation?.locationName || "").toLowerCase();
        const cust = (r.toLocation?.code || "").toLowerCase();
        const reqBy = (r.requester?.name || "").toLowerCase();
        const tripNo = (r.tripRequests?.[0]?.trip?.tripNo || "").toLowerCase();
        const vPlate = (r.tripRequests?.[0]?.trip?.vehicle?.vehicleNumber || "").toLowerCase();
        const dName = (r.tripRequests?.[0]?.trip?.driver?.name || "").toLowerCase();
        const rCode = (r.tripRequests?.[0]?.trip?.route?.routeCode || "").toLowerCase();

        if (
          !code.includes(q) &&
          !item.includes(q) &&
          !inv.includes(q) &&
          !fromLoc.includes(q) &&
          !toLoc.includes(q) &&
          !cust.includes(q) &&
          !reqBy.includes(q) &&
          !tripNo.includes(q) &&
          !vPlate.includes(q) &&
          !dName.includes(q) &&
          !rCode.includes(q)
        ) {
          return false;
        }
      }

      // 2. Plant
      if (selectedPlant && r.plant?.code !== selectedPlant && r.plant?.name !== selectedPlant) {
        return false;
      }

      // 3. Operation
      if (selectedOperation && r.operation?.name !== selectedOperation && r.operation?.code !== selectedOperation) {
        return false;
      }

      // 4. Status (Case-insensitive)
      if (selectedStatus) {
        const s = (r.status || "").toUpperCase();
        if (selectedStatus === "SUBMITTED") {
          if (s !== "SUBMITTED" && s !== "UNDER REVIEW") return false;
        } else if (selectedStatus === "ALLOCATED") {
          if (s !== "ALLOCATED" && s !== "ASSIGNED") return false;
        } else if (selectedStatus === "DISPATCHED") {
          if (s !== "DISPATCHED" && s !== "IN TRANSIT" && s !== "READY_FOR_LOADING") return false;
        } else if (selectedStatus === "COMPLETED") {
          if (!["COMPLETED", "FINALIZED", "CLOSED"].includes(s)) return false;
        } else if (selectedStatus === "CANCELLED_REJECTED") {
          if (s !== "CANCELLED" && s !== "REJECTED") return false;
        } else if (s !== selectedStatus.toUpperCase()) {
          return false;
        }
      }

      // 5. Date Range
      if (selectedDateRange) {
        const dateToCheck = r.requiredDate || r.createdAt;
        if (!filterByDate(dateToCheck, selectedDateRange)) {
          return false;
        }
      }

      return true;
    });
  }, [
    initialRequests,
    search,
    selectedPlant,
    selectedOperation,
    selectedStatus,
    selectedDateRange,
  ]);

  const hasActiveFilters =
    search !== "" ||
    selectedPlant !== "" ||
    selectedOperation !== "" ||
    selectedStatus !== "" ||
    selectedDateRange !== "this_week";

  const resetFilters = () => {
    setSearch("");
    setSelectedPlant("");
    setSelectedOperation("");
    setSelectedStatus("");
    setSelectedDateRange("this_week");
  };

  // Checkboxes
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRequests.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Excel Export
  const handleExportExcel = () => {
    const targetData =
      selectedIds.length > 0
        ? filteredRequests.filter((r) => selectedIds.includes(r.id))
        : filteredRequests;

    const rows = targetData.map((r) => ({
      "Request ID": r.requestCode,
      "Urgency": r.urgency || "Normal",
      "Plant": r.plant?.code || "",
      "Operation": r.operation?.name || "",
      "Sub Operation": r.subOperation?.name || "-",
      "Origin": r.fromLocation?.locationName || "",
      "Destination": r.toLocation?.locationName || "",
      "Customer Code": r.toLocation?.code || "-",
      "Item Description": r.itemDescription,
      "Quantity (KG)": Number(r.requiredKg) || 0,
      "Volume (CBM)": Number(r.requiredCbm) || 0,
      "Box Count": r.boxCount || 0,
      "Invoice Numbers": r.invoiceNumbers || "-",
      "Required Date": r.requiredDate ? new Date(r.requiredDate).toISOString().slice(0, 10) : "",
      "Required Time": r.requiredTime || "-",
      "Goods Ready": r.goodsReadyStatus || "-",
      "Requested By": r.requester?.name || "-",
      "Submitted At": r.createdAt ? new Date(r.createdAt).toLocaleString() : "-",
      "Trip ID": r.tripRequests?.[0]?.trip?.tripNo || "-",
      "Vehicle Plate": r.tripRequests?.[0]?.trip?.vehicle?.vehicleNumber || "-",
      "Assigned Driver": r.tripRequests?.[0]?.trip?.driver?.name || "-",
      "Route ID": r.tripRequests?.[0]?.trip?.route?.routeCode || "-",
      "Status": r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "VehicleRequests");
    XLSX.writeFile(wb, `STR_Vehicle_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col space-y-2.5 w-full">
      {/* Top Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-52 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Request ID, Item, Invoice..."
              className="w-full h-8 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Filter Dropdowns Grid on mobile, flex on desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 w-full sm:w-auto">
            {/* Plant Dropdown */}
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Plants</option>
              {plants.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name || p.code}
                </option>
              ))}
            </select>

            {/* Operation Dropdown */}
            <select
              value={selectedOperation}
              onChange={(e) => setSelectedOperation(e.target.value)}
              className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Operations</option>
              {operations.map((op) => (
                <option key={op.id} value={op.name}>
                  {op.name}
                </option>
              ))}
            </select>

            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted (Pending)</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED_REJECTED">Cancelled / Rejected</option>
            </select>

            {/* Date Range Dropdown */}
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
            <span className="hidden xs:inline">Total:&nbsp;</span>{filteredRequests.length}<span className="hidden xs:inline">&nbsp;Requests</span><span className="xs:hidden">&nbsp;Reqs</span>
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

          <Link
            href="/requests/create"
            className="h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">New Request</span>
            <span className="xs:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* Sticky Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-max text-xs leading-normal">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-200 border-b border-slate-300">
              <tr className="text-[10.5px] uppercase tracking-wider text-slate-700 font-bold">
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[115px] max-w-[130px]">REQUEST ID</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[75px] max-w-[85px]">URGENCY</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[85px] max-w-[100px]">PLANT</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[105px] max-w-[125px]">OPERATION</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-left min-w-[240px] max-w-[320px]">ORIGIN &rarr; DESTINATION</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[85px] max-w-[100px]">CUST CODE</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[170px] max-w-[240px]">ITEM DESCRIPTION</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-right min-w-[65px] max-w-[80px]">BOX</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-right min-w-[90px] max-w-[110px]">WEIGHT (KG)</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-right min-w-[85px] max-w-[105px]">VOLUME (CBM)</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[130px] max-w-[150px]">REQUIRED SCHEDULE</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[100px] max-w-[120px]">TRIP ID</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[120px] max-w-[140px]">VEHICLE PLATE</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-left min-w-[130px] max-w-[160px]">ASSIGNED DRIVER</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[100px] max-w-[120px]">ROUTE ID</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap border-r border-slate-300 text-center min-w-[95px] max-w-[110px]">STATUS</th>
                <th className="px-2.5 py-2.5 whitespace-nowrap text-center min-w-[70px] max-w-[85px]">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={17} className="py-10 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No requests found matching current filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or selecting another status.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const urgencyLower = (req.urgency || "normal").toLowerCase();
                  const urgencyBadgeClass =
                    urgencyLower === "critical"
                       ? "bg-rose-100 text-rose-800 border-rose-300"
                      : urgencyLower === "urgent" || urgencyLower === "high"
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-100 text-slate-600 border-slate-200";

                  const origin = req.fromLocation?.locationName || req.plant?.code || "-";
                  const dest = req.toLocation?.locationName || "-";

                  const assignedTrip = req.tripRequests?.[0]?.trip;
                  const tripId = req.tripRequests?.[0]?.tripId;
                  const tripNo = assignedTrip?.tripNo;
                  const vehiclePlate = assignedTrip?.vehicle?.vehicleNumber;
                  const vehicleType = assignedTrip?.vehicle?.vehicleType;
                  const driverName = assignedTrip?.driver?.name;
                  const driverMobile = assignedTrip?.driver?.mobile;
                  const routeCode = assignedTrip?.route?.routeCode;
                  const routeName = assignedTrip?.route?.routeName;

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/80 transition-colors border-b border-slate-100"
                    >
                      {/* Request ID */}
                      <td className="px-2.5 py-2.5 text-center font-bold text-blue-600 border-r border-slate-100 whitespace-nowrap min-w-[115px] max-w-[130px]">
                        <Link href={`/requests/${req.id}`} className="hover:underline">
                          {req.requestCode}
                        </Link>
                      </td>

                      {/* Urgency */}
                      <td className="px-2.5 py-2.5 text-center border-r border-slate-100 whitespace-nowrap min-w-[75px] max-w-[85px]">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold border uppercase ${urgencyBadgeClass}`}>
                          {req.urgency || "Normal"}
                        </span>
                      </td>

                      {/* Plant */}
                      <td className="px-2.5 py-2.5 text-center font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap min-w-[85px] max-w-[100px]">
                        <span>
                          {req.plant?.name || req.plant?.code}
                        </span>
                      </td>

                      {/* Operation */}
                      <td className="px-2.5 py-2.5 text-center font-normal text-slate-700 border-r border-slate-100 whitespace-nowrap min-w-[105px] max-w-[125px]">
                        {req.operation?.name || "-"}
                      </td>

                      {/* Origin -> Destination */}
                      <td
                        className="px-2.5 py-2.5 text-left font-normal text-slate-700 border-r border-slate-100 min-w-[240px] max-w-[320px] truncate"
                        title={`${origin} -> ${dest}`}
                      >
                        <span className="text-slate-500 font-normal">{origin}</span>
                        <span className="mx-1 text-slate-400 font-normal">&rarr;</span>
                        <span className="text-slate-700 font-normal">{dest}</span>
                      </td>

                      {/* Cust Code */}
                      <td className="px-2.5 py-2.5 text-center font-semibold text-slate-700 border-r border-slate-100 whitespace-nowrap text-xs min-w-[85px] max-w-[100px]">
                        {req.toLocation?.code || "-"}
                      </td>

                      {/* Item Description */}
                      <td
                        className="px-2.5 py-2.5 text-center font-normal text-slate-700 border-r border-slate-100 min-w-[170px] max-w-[240px] truncate"
                        title={req.itemDescription}
                      >
                        {req.itemDescription}
                      </td>

                      {/* Box */}
                      <td className="px-2.5 py-2.5 tabular-nums font-semibold text-right text-slate-800 border-r border-slate-100 whitespace-nowrap min-w-[65px] max-w-[80px]">
                        {req.boxCount || 0}
                      </td>

                      {/* Weight (KG) */}
                      <td className="px-2.5 py-2.5 tabular-nums font-semibold text-right text-slate-800 border-r border-slate-100 whitespace-nowrap min-w-[90px] max-w-[110px]">
                        {Number(req.requiredKg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>

                      {/* Volume (CBM) */}
                      <td className="px-2.5 py-2.5 tabular-nums font-semibold text-right text-slate-800 border-r border-slate-100 whitespace-nowrap min-w-[85px] max-w-[105px]">
                        {Number(req.requiredCbm || 0).toFixed(2)}
                      </td>

                      {/* Required Schedule */}
                      <td className="px-2.5 py-2.5 tabular-nums text-slate-600 border-r border-slate-100 whitespace-nowrap text-xs text-center min-w-[130px] max-w-[150px]">
                        <span>{req.requiredDate ? new Date(req.requiredDate).toISOString().slice(0, 10) : "-"}</span>
                        {req.requiredTime && <span className="ml-1 text-slate-400">{req.requiredTime}</span>}
                      </td>

                      {/* Trip ID */}
                      <td className="px-2.5 py-2.5 font-bold whitespace-nowrap border-r border-slate-100 text-center min-w-[100px] max-w-[120px]">
                        {tripId && tripNo ? (
                          <Link
                            href={currentUser?.roleCode === "ENTRY_USER" ? `/requests/${req.id}` : `/allocations/fg/combine/${tripId}`}
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors tracking-tight"
                            title="Allocated Trip Details"
                          >
                            <span>{tripNo}</span>
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Vehicle Plate */}
                      <td className="px-2.5 py-2.5 font-bold whitespace-nowrap border-r border-slate-100 text-center min-w-[120px] max-w-[140px]">
                        {vehiclePlate ? (
                          <span
                            className="inline-flex items-center gap-1 text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[10.5px] font-bold tracking-tight border border-slate-200"
                            title={vehicleType ? `Vehicle Spec: ${vehicleType}` : "Assigned Vehicle Plate"}
                          >
                            <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{vehiclePlate}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Assigned Driver */}
                      <td className="px-2.5 py-2.5 font-medium whitespace-nowrap border-r border-slate-100 text-left min-w-[130px] max-w-[160px] truncate">
                        {driverName ? (
                          <span
                            className="text-slate-800 font-medium"
                            title={driverMobile ? `Contact: ${driverMobile}` : undefined}
                          >
                            {driverName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Route ID */}
                      <td className="px-2.5 py-2.5 font-medium whitespace-nowrap border-r border-slate-100 text-center min-w-[100px] max-w-[120px]">
                        {routeCode ? (
                          <span
                            className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] tracking-tight max-w-[130px] truncate"
                            title={routeName || "Corridor Route"}
                          >
                            {routeCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-2.5 py-2.5 text-center whitespace-nowrap border-r border-slate-100 min-w-[95px] max-w-[110px]">
                        <StatusBadge status={req.status} className="text-[10px] px-2 py-0.5" />
                      </td>

                      {/* Actions */}
                      <td className="px-2.5 py-2 whitespace-nowrap text-center font-medium min-w-[70px] max-w-[85px]">
                        <Link
                          href={`/requests/${req.id}`}
                          className="inline-flex items-center justify-center gap-1 text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md text-xs font-medium transition-colors shadow-2xs"
                          title="View Request Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View</span>
                        </Link>
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
  );
}
