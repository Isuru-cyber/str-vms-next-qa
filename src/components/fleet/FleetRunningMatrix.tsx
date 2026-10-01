"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  FileSpreadsheet,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import * as XLSX from "xlsx";

interface MatrixTrip {
  id: number;
  tripNo: string;
  status: string;
  plannedKm: number | string | null;
  actualKm: number | string | null;
}

interface DayData {
  day: number;
  dateStr: string;
  status: "WORKING" | "NIGHT_PARK_HELDUP" | "DID_NOT_REPORT" | "ABSENT" | "OFF" | string;
  remarks: string | null;
  plannedKm: number | null;
  actualKm: number | null;
  varianceKm: number | null;
  tripCount: number;
  trips: MatrixTrip[];
}

interface VehicleMatrixItem {
  id: number;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  homePlant: string;
  paymentBasis: string;
  monthlyFixedRate: number;
  monthlyKmLimit: number;
  extraKmRate: number;
  fuelConsumptionKml: number;
  runningCostPerKm: number;
  profitPerKm: number;
  days: Record<number, DayData>;
  summary: {
    totalActualKm: number;
    totalPlannedKm: number;
    totalVarianceKm: number;
    workingDays: number;
    heldupDays: number;
    didNotReportDays: number;
    absentDays: number;
    remarks: string | null;
  };
}

interface FleetRunningMatrixProps {
  initialData: {
    year: number;
    month: number;
    daysInMonth: number;
    monthStr: string;
    vehicles: VehicleMatrixItem[];
  };
}

export function FleetRunningMatrix({ initialData }: FleetRunningMatrixProps) {
  const [year, setYear] = useState<number>(initialData.year);
  const [month, setMonth] = useState<number>(initialData.month);
  const [daysInMonth, setDaysInMonth] = useState<number>(initialData.daysInMonth);
  const [vehicles, setVehicles] = useState<VehicleMatrixItem[]>(initialData.vehicles);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Main 3-Way Metric Switcher
  const [activeMetric, setActiveMetric] = useState<"ACTUAL" | "PLANNED" | "VARIANCE">("ACTUAL");

  // Filters
  const [search, setSearch] = useState("");
  const [plantFilter, setPlantFilter] = useState("ALL");
  const [rateBasisFilter, setRateBasisFilter] = useState<"ALL" | "KM" | "FIXED">("KM");

  // Status/Comment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleMatrixItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [editStatus, setEditStatus] = useState<string>("WORKING");
  const [editRemarks, setEditRemarks] = useState<string>("");
  const [savingLog, setSavingLog] = useState(false);

  // Conflict Warning Modal
  const [conflictWarning, setConflictWarning] = useState<{
    open: boolean;
    message: string;
    trips: MatrixTrip[];
  }>({ open: false, message: "", trips: [] });

  // Month navigation
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Distinct plants
  const availablePlants = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.homePlant) set.add(v.homePlant);
    });
    return Array.from(set).sort();
  }, [vehicles]);

  // Fetch data when year or month changes
  const loadMonthData = async (newYear: number, newMonth: number) => {
    setIsLoading(true);
    try {
      const monthStr = `${newYear}-${String(newMonth).padStart(2, "0")}`;
      const res = await fetch(`/api/fleet/matrix?month=${monthStr}`);
      const json = await res.json();
      if (json.success) {
        setYear(json.year);
        setMonth(json.month);
        setDaysInMonth(json.daysInMonth);
        setVehicles(json.vehicles);
      }
    } catch (err) {
      console.error("Failed to load month matrix:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrevMonth = () => {
    let nextY = year;
    let nextM = month - 1;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    loadMonthData(nextY, nextM);
  };

  const handleNextMonth = () => {
    let nextY = year;
    let nextM = month + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    loadMonthData(nextY, nextM);
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (plantFilter !== "ALL" && v.homePlant !== plantFilter) return false;
      if (rateBasisFilter === "KM" && v.paymentBasis !== "KM_BASED" && v.paymentBasis !== "KM") return false;
      if (rateBasisFilter === "FIXED" && v.paymentBasis !== "FIXED") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.driverName.toLowerCase().includes(q) ||
        v.vehicleType.toLowerCase().includes(q) ||
        v.homePlant.toLowerCase().includes(q)
      );
    });
  }, [vehicles, search, plantFilter, rateBasisFilter]);

  // Open Edit Modal for a Cell
  const handleCellClick = (v: VehicleMatrixItem, dayData: DayData) => {
    setSelectedVehicle(v);
    setSelectedDay(dayData);
    setEditStatus(dayData.status === "OFF" ? "WORKING" : dayData.status);
    setEditRemarks(dayData.remarks || "");
    setModalOpen(true);
  };

  // Submit Daily Log / Status
  const handleSaveDailyLog = async (forceOverride = false) => {
    if (!selectedVehicle || !selectedDay) return;

    setSavingLog(true);
    try {
      const res = await fetch("/api/fleet/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: selectedVehicle.id,
          date: selectedDay.dateStr,
          status: editStatus,
          remarks: editRemarks.trim(),
          forceOverride,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.conflict && !forceOverride) {
          // Open conflict warning modal!
          setConflictWarning({
            open: true,
            message: json.message,
            trips: json.trips || [],
          });
          return;
        }
        alert(json.message || "Failed to update status.");
        return;
      }

      // Optimistically update local matrix
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id !== selectedVehicle.id) return v;

          const updatedDays = { ...v.days };
          const oldDay = updatedDays[selectedDay.day];
          updatedDays[selectedDay.day] = {
            ...oldDay,
            status: editStatus,
            remarks: editRemarks.trim() || null,
          };

          // Re-calculate vehicle summary
          let workingDays = 0;
          let heldupDays = 0;
          let didNotReportDays = 0;
          let absentDays = 0;

          Object.values(updatedDays).forEach((d) => {
            if (d.status === "WORKING") workingDays++;
            else if (d.status === "NIGHT_PARK_HELDUP") heldupDays++;
            else if (d.status === "DID_NOT_REPORT") didNotReportDays++;
            else if (d.status === "ABSENT") absentDays++;
          });

          return {
            ...v,
            days: updatedDays,
            summary: {
              ...v.summary,
              workingDays,
              heldupDays,
              didNotReportDays,
              absentDays,
            },
          };
        })
      );

      setModalOpen(false);
      setConflictWarning({ open: false, message: "", trips: [] });
    } catch (err: any) {
      alert(err.message || "An error occurred while saving.");
    } finally {
      setSavingLog(false);
    }
  };

  // Export to Excel (100% Matching Layout)
  const handleExportExcel = () => {
    const headers = [
      "Vehicle Type",
      "Vehicle Plate & Driver",
      "Rate Basis",
    ];

    // Add days 1 to daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(`${d}-${monthNames[month - 1].slice(0, 3)}`);
    }

    headers.push(
      "Total KM (Actual)",
      "Total KM (Planned)",
      "Variance (KM)",
      "# Heldup Days",
      "# Working Days",
      "# Absent / Breakdown Days",
      "Monthly Remarks"
    );

    const dataRows = filteredVehicles.map((v) => {
      const row: (string | number)[] = [
        v.vehicleType,
        `${v.vehicleNumber} - ${v.driverName}`,
        v.paymentBasis === "FIXED" ? `Fixed (Rs. ${v.monthlyFixedRate})` : "KM-Based",
      ];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayInfo = v.days[d];
        if (!dayInfo) {
          row.push("");
          continue;
        }

        let cellVal = "";
        if (dayInfo.status === "DID_NOT_REPORT") {
          cellVal = "BREAKDOWN (No Report)";
        } else if (dayInfo.status === "ABSENT") {
          cellVal = "ABSENT";
        } else if (dayInfo.status === "NIGHT_PARK_HELDUP") {
          cellVal = `HELDUP (${dayInfo.actualKm || dayInfo.plannedKm || 0} KM)`;
        } else if (dayInfo.actualKm !== null) {
          cellVal = `${dayInfo.actualKm}`;
        } else if (dayInfo.plannedKm !== null) {
          cellVal = `(Plan: ${dayInfo.plannedKm})`;
        }

        row.push(cellVal);
      }

      row.push(
        v.summary.totalActualKm,
        v.summary.totalPlannedKm,
        v.summary.totalVarianceKm,
        v.summary.heldupDays,
        v.summary.workingDays,
        v.summary.didNotReportDays + v.summary.absentDays,
        v.summary.remarks || ""
      );

      return row;
    });

    const ws = XLSX.utils.aoa_to_sheet([
      [`Running Details Summary - ${monthNames[month - 1]} ${year}`],
      [],
      headers,
      ...dataRows,
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RunningSummary");
    XLSX.writeFile(wb, `Fleet_Running_Summary_${year}_${String(month).padStart(2, "0")}.xlsx`);
  };

  return (
    <div className="space-y-2 w-full min-w-0 text-slate-800 flex flex-col min-h-0">
      {/* Top Header & Year/Month Controls Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xs">
            <Truck className="w-4 h-4 text-amber-400" />
            <h1 className="text-xs sm:text-sm font-bold tracking-tight">
              Monthly Running & Attendance Matrix
            </h1>
          </div>

          {/* Year and Month Selectors */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isLoading}
              className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-2xs transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Year Dropdown */}
            <select
              value={year}
              onChange={(e) => loadMonthData(Number(e.target.value), month)}
              className="text-xs font-bold bg-transparent text-slate-800 px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Month Dropdown */}
            <select
              value={month}
              onChange={(e) => loadMonthData(year, Number(e.target.value))}
              className="text-xs font-bold bg-transparent text-slate-800 px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isLoading}
              className="p-1 rounded text-slate-600 hover:bg-white hover:shadow-2xs transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metric Switcher (Toggle between Actual, Planned, Variance) */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 hidden sm:inline">
            Display:
          </span>
          <button
            type="button"
            onClick={() => setActiveMetric("ACTUAL")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMetric === "ACTUAL"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            Actual KM
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("PLANNED")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMetric === "PLANNED"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            System KM
          </button>
          <button
            type="button"
            onClick={() => setActiveMetric("VARIANCE")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeMetric === "VARIANCE"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            Variance (+/−)
          </button>
        </div>

        {/* Right Actions: Excel Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>Export Matrix</span>
          </button>
        </div>
      </div>

      {/* Sub-bar: Search, Plant Filters & Color Legend */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, driver..."
              className="w-full h-7 text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
          </div>

          {/* Rate Basis Selector (Default: KM) */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 font-medium">Rate Basis:</span>
            <select
              value={rateBasisFilter}
              onChange={(e) => setRateBasisFilter(e.target.value as "ALL" | "KM" | "FIXED")}
              className="h-7 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="KM">KM-Based (Default)</option>
              <option value="FIXED">Fixed Contract</option>
              <option value="ALL">All Rate Bases</option>
            </select>
          </div>

          {/* Plant Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 font-medium">Plant:</span>
            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="h-7 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Plants</option>
              {availablePlants.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Visual Color Legend matching User's Excel */}
        <div className="flex items-center gap-2.5 flex-wrap text-[11px] font-semibold text-slate-700">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Legend:</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block shadow-2xs" />
            <span>Working Day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block shadow-2xs" />
            <span>Night Park & Heldup</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-rose-600 inline-block shadow-2xs" />
            <span>Did Not Report (Breakdown)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block shadow-2xs" />
            <span>Absent / Off</span>
          </div>
        </div>
      </div>

      {/* Main 31-Day Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] scrollbar-thin">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            {/* Table Header */}
            <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-30 shadow-xs">
              <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider border-b border-slate-800">
                {/* Fixed Left Header Columns */}
                <th className="py-2.5 px-2.5 sticky left-0 z-30 bg-slate-900 font-bold border-r border-slate-800 w-20 min-w-[76px] max-w-[80px]">
                  Vehicle Type
                </th>
                <th className="py-2.5 px-2.5 sticky left-[76px] z-30 bg-slate-900 font-bold border-r border-slate-800 w-40 min-w-[150px] max-w-[160px]">
                  Vehicle & Driver
                </th>
                <th className="py-2.5 px-2 text-center font-bold border-r border-slate-800 w-16 min-w-[58px] max-w-[62px]">
                  Rate Basis
                </th>

                {/* Day Columns 1 to daysInMonth */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <th
                    key={d}
                    className="py-2.5 px-1 text-center font-bold border-r border-slate-800 min-w-[46px] max-w-[50px]"
                  >
                    {d}
                  </th>
                ))}

                {/* Right Summary Columns (Remarks column removed as requested) */}
                <th className="py-2.5 px-2 text-right font-bold border-r border-slate-800 bg-slate-900 sticky right-[168px] z-20 w-20 min-w-[76px]">
                  Total KM
                </th>
                <th className="py-2.5 px-1.5 text-center font-bold border-r border-slate-800 bg-slate-900 sticky right-[112px] z-20 w-14 min-w-[54px]">
                  # Heldup
                </th>
                <th className="py-2.5 px-1.5 text-center font-bold border-r border-slate-800 bg-slate-900 sticky right-[56px] z-20 w-14 min-w-[54px]">
                  # Working
                </th>
                <th className="py-2.5 px-1.5 text-center font-bold bg-slate-900 sticky right-0 z-20 w-14 min-w-[54px]">
                  # Absent
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td
                    colSpan={daysInMonth + 7}
                    className="py-12 text-center text-slate-400 font-medium"
                  >
                    No vehicles found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Vehicle Type */}
                      <td className="py-2 px-2.5 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 text-slate-700 font-medium text-[11px] w-20 min-w-[76px] max-w-[80px] truncate">
                        {v.vehicleType}
                      </td>

                      {/* Vehicle Plate & Driver */}
                      <td className="py-2 px-2.5 sticky left-[76px] z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 w-40 min-w-[150px] max-w-[160px]">
                        <div className="font-bold text-slate-900 text-xs tracking-tight">
                          {v.vehicleNumber}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                          {v.driverName}
                        </div>
                      </td>

                      {/* Payment Basis */}
                      <td className="py-2 px-1 text-center border-r border-slate-200 w-16 min-w-[58px] max-w-[62px]">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            v.paymentBasis === "FIXED"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {v.paymentBasis === "FIXED" ? "FIXED" : "KM"}
                        </span>
                      </td>

                      {/* 31 Calendar Day Cells */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                        const dayData = v.days[d] || {
                          day: d,
                          dateStr: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
                          status: "OFF",
                          remarks: null,
                          plannedKm: null,
                          actualKm: null,
                          varianceKm: null,
                          tripCount: 0,
                          trips: [],
                        };

                        // Determine display value based on activeMetric
                        let displayVal: string | number = "";
                        if (activeMetric === "ACTUAL") {
                          if (dayData.actualKm !== null) displayVal = Math.round(dayData.actualKm);
                          else if (dayData.plannedKm !== null) displayVal = `~${Math.round(dayData.plannedKm)}`;
                        } else if (activeMetric === "PLANNED") {
                          if (dayData.plannedKm !== null) displayVal = Math.round(dayData.plannedKm);
                        } else if (activeMetric === "VARIANCE") {
                          if (dayData.varianceKm !== null) {
                            displayVal =
                              dayData.varianceKm > 0
                                ? `+${dayData.varianceKm.toFixed(0)}`
                                : dayData.varianceKm.toFixed(0);
                          }
                        }

                        // Determine cell background color
                        let cellBg = "bg-white hover:bg-slate-100";
                        let textColor = "text-slate-700";

                        if (dayData.status === "WORKING") {
                          cellBg = "bg-emerald-500 hover:bg-emerald-600 text-white font-bold";
                          textColor = "text-white";
                        } else if (dayData.status === "NIGHT_PARK_HELDUP") {
                          cellBg = "bg-blue-600 hover:bg-blue-700 text-white font-bold";
                          textColor = "text-white";
                        } else if (dayData.status === "DID_NOT_REPORT") {
                          cellBg = "bg-rose-600 hover:bg-rose-700 text-white font-bold animate-pulse";
                          textColor = "text-white";
                          displayVal = "X";
                        } else if (dayData.status === "ABSENT") {
                          cellBg = "bg-amber-500 hover:bg-amber-600 text-white font-bold";
                          textColor = "text-white";
                          displayVal = "AB";
                        }

                        // Tooltip Content
                        const tooltipText = `
${v.vehicleNumber} (${dayData.dateStr})
Status: ${dayData.status}
Actual KM: ${dayData.actualKm ?? "Not entered"} | Planned: ${dayData.plannedKm ?? 0} KM
Variance: ${dayData.varianceKm !== null ? (dayData.varianceKm > 0 ? `+${dayData.varianceKm}` : dayData.varianceKm) : "-"} KM
Trips: ${dayData.trips.map((t) => t.tripNo).join(", ") || "None"}
${dayData.remarks ? `Remark: "${dayData.remarks}"` : "Click to edit status or add remarks"}
                        `.trim();

                        return (
                          <td
                            key={d}
                            onClick={() => handleCellClick(v, dayData)}
                            className={`py-2 px-1 text-center border-r border-slate-200 text-xs tabular-nums cursor-pointer select-none transition-colors relative min-w-[46px] max-w-[50px] ${cellBg} ${textColor}`}
                            title={tooltipText}
                          >
                            <span>{displayVal || "·"}</span>
                            {dayData.remarks && (
                              <span
                                className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-300 ring-1 ring-black/20"
                                title={`Note: ${dayData.remarks}`}
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Right Summary Totals */}
                      {/* Total KM */}
                      <td className="py-2 px-2 text-right font-bold text-xs tabular-nums border-r border-slate-200 bg-white group-hover:bg-slate-50 sticky right-[168px] z-10 w-20 min-w-[76px]">
                        {v.summary.totalActualKm > 0
                          ? v.summary.totalActualKm.toFixed(0)
                          : v.summary.totalPlannedKm.toFixed(0)}
                      </td>

                      {/* # Heldup Days */}
                      <td className="py-2 px-1.5 text-center text-xs font-bold tabular-nums border-r border-slate-200 bg-white group-hover:bg-slate-50 sticky right-[112px] z-10 w-14 min-w-[54px] text-blue-700">
                        {v.summary.heldupDays}
                      </td>

                      {/* # Working Days */}
                      <td className="py-2 px-1.5 text-center text-xs font-bold tabular-nums border-r border-slate-200 bg-white group-hover:bg-slate-50 sticky right-[56px] z-10 w-14 min-w-[54px] text-emerald-700">
                        {v.summary.workingDays}
                      </td>

                      {/* # Absent / Breakdown Days */}
                      <td className="py-2 px-1.5 text-center text-xs font-bold tabular-nums bg-white group-hover:bg-slate-50 sticky right-0 z-10 w-14 min-w-[54px] text-rose-700">
                        {v.summary.didNotReportDays + v.summary.absentDays}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Status & Comment Modal */}
      {modalOpen && selectedVehicle && selectedDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight">
                    Log Vehicle Status — {selectedVehicle.vehicleNumber}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {selectedDay.dateStr} (Day {selectedDay.day})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3.5 text-xs">
              {/* Day Snapshot Box */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Driver:</span>
                  <strong className="text-slate-800">{selectedVehicle.driverName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Distance (Actual / Planned):</span>
                  <span className="font-bold text-indigo-700">
                    {selectedDay.actualKm !== null ? `${selectedDay.actualKm} KM` : "No Actual KM"} / {selectedDay.plannedKm || 0} KM
                  </span>
                </div>
                {selectedDay.tripCount > 0 && (
                  <div className="pt-1 border-t border-slate-200/80">
                    <span className="text-slate-500 font-medium block mb-1">Allocated Trips (Click to view details):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDay.trips.map((t) => (
                        <a
                          key={t.id}
                          href={`/trips/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 border border-indigo-200 text-xs font-bold transition shadow-2xs group cursor-pointer"
                          title="Open Trip Details in new tab"
                        >
                          <span>{t.tripNo}</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-indigo-600">
                            ({t.actualKm ? `${t.actualKm} km` : `${t.plannedKm || 0} km`})
                          </span>
                          <ExternalLink className="w-3 h-3 text-indigo-500 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Radio / Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Select Daily Operational Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus("WORKING")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                      editStatus === "WORKING"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs">Working Day</div>
                      <div className="text-[10px] font-normal text-slate-500">Normal trip / duty</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus("NIGHT_PARK_HELDUP")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                      editStatus === "NIGHT_PARK_HELDUP"
                        ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-500"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs">Night Park & Heldup</div>
                      <div className="text-[10px] font-normal text-slate-500">Overnight delayed</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus("DID_NOT_REPORT")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                      editStatus === "DID_NOT_REPORT"
                        ? "bg-rose-50 border-rose-500 text-rose-900 ring-1 ring-rose-500"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-rose-600 shrink-0" />
                    <div>
                      <div className="text-xs">Did Not Report</div>
                      <div className="text-[10px] font-normal text-slate-500">Breakdown / No show</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditStatus("ABSENT")}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 cursor-pointer ${
                      editStatus === "ABSENT"
                        ? "bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-500"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <div className="text-xs">Absent / Off Duty</div>
                      <div className="text-[10px] font-normal text-slate-500">Driver sick / Leave</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Remarks / Comments Input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Daily Remark / Comment (Reason):
                </label>
                <textarea
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="e.g. Radiator leak, waiting for bay clearance, driver on leave..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 bg-white font-medium"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={savingLog}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDailyLog(false)}
                  disabled={savingLog}
                  className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {savingLog ? "Saving..." : "Save Status"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Conflict Warning Modal */}
      {conflictWarning.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm tracking-tight">
                  Operational Conflict Detected
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConflictWarning({ open: false, message: "", trips: [] })}
                className="p-1 rounded-lg text-rose-200 hover:text-white hover:bg-rose-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 space-y-1.5">
                <p className="font-semibold">{conflictWarning.message}</p>
                <p className="text-[11px] text-rose-700">
                  If this vehicle actually broke down or did not report to work, marking it will trigger a penalty/rent deduction for this day.
                </p>
              </div>

              {conflictWarning.trips.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-700">Recorded Trips:</span>
                  <div className="space-y-1">
                    {conflictWarning.trips.map((t) => (
                      <div
                        key={t.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                      >
                        <strong className="text-indigo-700">{t.tripNo}</strong>
                        <span className="text-slate-500 font-medium">Status: {t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConflictWarning({ open: false, message: "", trips: [] })}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel (Keep As Is)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveDailyLog(true)}
                  disabled={savingLog}
                  className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  {savingLog ? "Overriding..." : "Confirm Override (Did Not Report)"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
