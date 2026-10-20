"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Truck,
  User,
  Clock,
  Sparkles,
  BarChart3,
  Layers,
  ArrowUpDown,
  Download,
  Building2,
  Tag,
  MessageSquare,
  X,
  Save,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Package,
  MapPin,
  FileCheck2,
  DollarSign,
  Gauge,
  Phone,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber, formatCurrency } from "@/lib/utils";
import * as XLSX from "xlsx";

interface MasterOption {
  code: string;
  name: string;
}

interface FullTripDetailsClientProps {
  initialTrips: any[];
  plants: any[];
  vehicles: any[];
  masterOptions: {
    deliveryWindows: MasterOption[];
    planningTypes: MasterOption[];
    requestedByDepts: MasterOption[];
  };
}

const PAGE_SIZE = 200;

export function FullTripDetailsClient({
  initialTrips,
  plants,
  vehicles,
  masterOptions,
}: FullTripDetailsClientProps) {
  const [activeTab, setActiveTab] = useState<"REGISTRY" | "ANALYTICS">("REGISTRY");
  const [trips, setTrips] = useState<any[]>(initialTrips);
  const [isLoading, setIsLoading] = useState(false);

  // Side Drawer Selected Trip (Opens when clicking any row)
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  // Filter Toggle state: By default, advanced filters are hidden
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Filters State
  const [dateRangePreset, setDateRangePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState("ALL");
  const [selectedPaymentBasis, setSelectedPaymentBasis] = useState("ALL");
  const [selectedDeliveryWindow, setSelectedDeliveryWindow] = useState("ALL");
  const [selectedPlanningType, setSelectedPlanningType] = useState("ALL");
  const [selectedRequestedBy, setSelectedRequestedBy] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Quick Inline Edit State
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drawerRemarksText, setDrawerRemarksText] = useState("");
  const [savingDrawerRemarks, setSavingDrawerRemarks] = useState(false);

  // Sync drawer remarks text when selectedTrip changes
  useEffect(() => {
    if (selectedTrip) {
      setDrawerRemarksText(selectedTrip.adminRemarks || "");
    }
  }, [selectedTrip]);

  // If initialTrips is empty, automatically fetch from API on mount
  useEffect(() => {
    if (trips.length === 0) {
      handleRefreshData();
    }
  }, []);

  // Keyboard shortcut: close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedTrip(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Count active advanced filters
  const activeAdvancedFiltersCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count++;
    if (selectedPlant !== "ALL") count++;
    if (selectedVehicle !== "ALL") count++;
    if (selectedPaymentBasis !== "ALL") count++;
    if (selectedDeliveryWindow !== "ALL") count++;
    if (selectedPlanningType !== "ALL") count++;
    if (selectedRequestedBy !== "ALL") count++;
    if (selectedStatus !== "ALL") count++;
    return count;
  }, [
    search,
    selectedPlant,
    selectedVehicle,
    selectedPaymentBasis,
    selectedDeliveryWindow,
    selectedPlanningType,
    selectedRequestedBy,
    selectedStatus,
  ]);

  // Quick Date Preset Handler
  const handleDatePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "YESTERDAY") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "THIS_WEEK") {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      setStartDate(monday.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "LAST_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    }
    setCurrentPage(1);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setSelectedPlant("ALL");
    setSelectedVehicle("ALL");
    setSelectedPaymentBasis("ALL");
    setSelectedDeliveryWindow("ALL");
    setSelectedPlanningType("ALL");
    setSelectedRequestedBy("ALL");
    setSelectedStatus("ALL");
    setDateRangePreset("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Reload data from API
  const handleRefreshData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedPlant !== "ALL") params.set("plantId", selectedPlant);
      if (selectedVehicle !== "ALL") params.set("vehicleId", selectedVehicle);
      if (selectedPaymentBasis !== "ALL") params.set("paymentBasis", selectedPaymentBasis);
      if (selectedDeliveryWindow !== "ALL") params.set("deliveryWindow", selectedDeliveryWindow);
      if (selectedPlanningType !== "ALL") params.set("planningType", selectedPlanningType);
      if (selectedRequestedBy !== "ALL") params.set("requestedByDept", selectedRequestedBy);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/trips/full-details?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.trips)) {
        setTrips(data.trips);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error("Failed to refresh trips:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered trips computation
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // 1. Text Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const tripNoMatch = (t.tripNo || "").toLowerCase().includes(q);
        const vehMatch = (t.vehicle?.vehicleNumber || "").toLowerCase().includes(q);
        const drvMatch = (t.driver?.name || "").toLowerCase().includes(q);
        const routeMatch = (t.route?.routeName || "").toLowerCase().includes(q);
        const reqMatch = (t.tripRequests || []).some((tr: any) =>
          (tr.request?.requestCode || "").toLowerCase().includes(q)
        );
        const remarksMatch = (t.adminRemarks || "").toLowerCase().includes(q);
        const gpMatch = (t.gatePasses || []).some((g: any) =>
          (g.gatePassNo || "").toLowerCase().includes(q)
        );
        if (
          !tripNoMatch &&
          !vehMatch &&
          !drvMatch &&
          !routeMatch &&
          !reqMatch &&
          !remarksMatch &&
          !gpMatch
        ) {
          return false;
        }
      }

      // 2. Plant Filter
      if (selectedPlant !== "ALL") {
        const pId = Number(selectedPlant);
        const matchesPlant = (t.tripRequests || []).some(
          (tr: any) => tr.request?.plantId === pId
        );
        if (!matchesPlant) return false;
      }

      // 3. Vehicle Filter
      if (selectedVehicle !== "ALL") {
        if (t.vehicleId !== Number(selectedVehicle)) return false;
      }

      // 4. Payment Basis
      if (selectedPaymentBasis !== "ALL") {
        if (selectedPaymentBasis === "ADHOC") {
          const isAdhoc =
            t.paymentBasis === "ADHOC" ||
            t.vehicle?.ownershipType === "ADHOC" ||
            (t.vehicle?.vehicleType || "").toUpperCase().includes("AD-HOC");
          if (!isAdhoc) return false;
        } else {
          if (t.paymentBasis !== selectedPaymentBasis) return false;
        }
      }

      // 5. Delivery Window
      if (selectedDeliveryWindow !== "ALL") {
        if (t.deliveryWindow !== selectedDeliveryWindow) return false;
      }

      // 6. Planning Type
      if (selectedPlanningType !== "ALL") {
        const currentP = (t.planningType || "Planned").toLowerCase();
        if (currentP !== selectedPlanningType.toLowerCase()) return false;
      }

      // 7. Requested By
      if (selectedRequestedBy !== "ALL") {
        if (t.requestedByDept !== selectedRequestedBy) return false;
      }

      // 8. Status
      if (selectedStatus !== "ALL") {
        if (t.status !== selectedStatus) return false;
      }

      // 9. Date Range Filter
      if (startDate) {
        const tDate = new Date(t.createdAt).toISOString().split("T")[0];
        if (tDate < startDate) return false;
      }
      if (endDate) {
        const tDate = new Date(t.createdAt).toISOString().split("T")[0];
        if (tDate > endDate) return false;
      }

      return true;
    });
  }, [
    trips,
    search,
    selectedPlant,
    selectedVehicle,
    selectedPaymentBasis,
    selectedDeliveryWindow,
    selectedPlanningType,
    selectedRequestedBy,
    selectedStatus,
    startDate,
    endDate,
  ]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedPlant,
    selectedVehicle,
    selectedPaymentBasis,
    selectedDeliveryWindow,
    selectedPlanningType,
    selectedRequestedBy,
    selectedStatus,
    startDate,
    endDate,
  ]);

  // Total pages
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / PAGE_SIZE));

  // Current page items (Strictly max 200 records per page)
  const paginatedTrips = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredTrips.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTrips, currentPage]);

  // Update classification inline or from drawer
  const handleUpdateClassification = async (
    tripId: number,
    field: "deliveryWindow" | "planningType" | "requestedByDept",
    value: string
  ) => {
    setSavingId(tripId);
    try {
      const res = await fetch(`/api/trips/${tripId}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update classification.");
      }

      // Update in trips list
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, [field]: value } : t))
      );

      // Update in selectedTrip if drawer is open
      setSelectedTrip((prev: any) =>
        prev && prev.id === tripId ? { ...prev, [field]: value } : prev
      );
    } catch (e: any) {
      alert(e.message || "Failed to update classification.");
    } finally {
      setSavingId(null);
    }
  };

  // Save Remarks from Drawer
  const handleSaveDrawerRemarks = async () => {
    if (!selectedTrip) return;
    setSavingDrawerRemarks(true);
    try {
      const res = await fetch(`/api/trips/${selectedTrip.id}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRemarks: drawerRemarksText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save remarks.");
      }

      setTrips((prev) =>
        prev.map((t) =>
          t.id === selectedTrip.id ? { ...t, adminRemarks: drawerRemarksText } : t
        )
      );
      setSelectedTrip((prev: any) =>
        prev ? { ...prev, adminRemarks: drawerRemarksText } : prev
      );
      alert("Remarks updated successfully!");
    } catch (e: any) {
      alert(e.message || "Failed to save remarks.");
    } finally {
      setSavingDrawerRemarks(false);
    }
  };

  // Export to Excel (Comprehensive 360° Data Grid)
  const handleExportExcel = () => {
    if (filteredTrips.length === 0) {
      alert("No trips to export matching the current filters.");
      return;
    }

    const rows = filteredTrips.map((t, idx) => {
      const reqList = (t.tripRequests || []).map((tr: any) => tr.request).filter(Boolean);
      const reqCodes = reqList.map((r: any) => r.requestCode).join(", ");
      const requesters = Array.from(new Set(reqList.map((r: any) => r.requester?.name).filter(Boolean))).join(", ");
      const plants = Array.from(new Set(reqList.map((r: any) => r.plant?.code).filter(Boolean))).join(", ");
      const origins = Array.from(new Set(reqList.map((r: any) => r.fromLocation?.locationName).filter(Boolean))).join("; ");
      const destinations = Array.from(new Set(reqList.map((r: any) => r.toLocation?.locationName).filter(Boolean))).join("; ");
      const cargoDescriptions = Array.from(new Set(reqList.map((r: any) => r.itemDescription).filter(Boolean))).join(" | ");
      const totalBoxes = reqList.reduce((sum: number, r: any) => sum + (Number(r.boxCount) || 0), 0);
      const totalKg = reqList.reduce((sum: number, r: any) => sum + (Number(r.requiredKg) || 0), 0);
      const totalCbm = reqList.reduce((sum: number, r: any) => sum + (Number(r.requiredCbm) || 0), 0);
      const gatePasses = (t.gatePasses || []).map((gp: any) => gp.gatePassNo).join(", ");
      const lastRec = t.reconciliations?.[0];

      const isAdhoc =
        t.paymentBasis === "ADHOC" ||
        t.vehicle?.ownershipType === "ADHOC" ||
        (t.vehicle?.vehicleType || "").toUpperCase().includes("AD-HOC");

      return {
        "Index": idx + 1,
        "Trip No": t.tripNo,
        "Status": t.status,
        "Allocation Date": t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "",
        "Origin Plant": plants || "",
        "Corridor Route": t.route?.routeName || "Consolidated Route",
        "Origin Location": origins || "",
        "Destination Locations": destinations || "",
        "Cargo Description": cargoDescriptions || "",
        "Total Boxes": totalBoxes,
        "Total Weight (KG)": totalKg,
        "Total Volume (CBM)": parseFloat(totalCbm.toFixed(3)),
        "Vehicle Number": t.vehicle?.vehicleNumber || "Unassigned",
        "Vehicle Category": t.vehicle?.vehicleCategory || t.vehicle?.vehicleType || "Standard",
        "Fleet Ownership / Basis": isAdhoc ? "Outside Ad-Hoc Hire" : (t.paymentBasis || "KM_BASED"),
        "Driver Name": t.driver?.name || "Unassigned",
        "Driver Mobile": t.driver?.mobile || "",
        "Driver NIC": t.driver?.nic || "",
        "Gate Pass Numbers": gatePasses || "",
        "Departure Time": t.actualStart ? new Date(t.actualStart).toLocaleString() : "",
        "Completion Time": t.actualEnd ? new Date(t.actualEnd).toLocaleString() : "",
        "Planned Distance (KM)": Number(t.plannedKm || 0),
        "Actual Distance (KM)": Number(t.actualKm || 0),
        "Variance Distance (KM)": Number(t.varianceKm || 0),
        "Variance Reason": t.varianceReason || "",
        "Diesel Rate (Rs)": Number(t.dieselRateApplied || 0),
        "Fuel Cost (Rs)": Number(t.fuelCost || 0),
        "Running Cost (Rs)": Number(t.runningCost || 0),
        "Driver Profit (Rs)": Number(t.driverProfit || 0),
        "Daily Fixed Cost Share (Rs)": Number(t.fixedDailyCost || 0),
        "Total Trip Cost (Rs)": Number(t.totalTripCost || 0),
        "Datatex Reconciled Status": lastRec?.matchStatus || "PENDING",
        "Datatex Invoices": lastRec?.invoiceNumbers || "",
        "Completed By": t.completedByUser?.name || "",
        "Delivery Window / Shift": t.deliveryWindow || "Not Specified",
        "Planning Type": t.planningType || "Planned",
        "Requested By Department": t.requestedByDept || "Not Specified",
        "Combined Requests": reqCodes || "",
        "Requesters": requesters || "",
        "Operational Remarks": t.adminRemarks || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Full Trip Details");
    const fileName = `STR_Full_Trip_Details_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Analytics Computations
  const analyticsData = useMemo(() => {
    const total = filteredTrips.length;
    let planned = 0;
    let special = 0;
    let adhoc = 0;
    let company = 0;
    let totalCost = 0;
    let totalPlannedKm = 0;
    let totalActualKm = 0;
    let totalKg = 0;
    let totalCbm = 0;

    const windowCounts: Record<string, number> = {
      "Morning - Sameday Unloading": 0,
      "Evening - Next Day Unloading": 0,
      "Overnight Delivery": 0,
      "Not Specified": 0,
    };

    const deptCounts: Record<string, number> = {};

    for (const t of filteredTrips) {
      const p = (t.planningType || "Planned").toLowerCase();
      if (p.includes("special")) {
        special++;
      } else {
        planned++;
      }

      const isAdhoc =
        t.paymentBasis === "ADHOC" ||
        t.vehicle?.ownershipType === "ADHOC" ||
        (t.vehicle?.vehicleType || "").toUpperCase().includes("AD-HOC");
      if (isAdhoc) {
        adhoc++;
      } else {
        company++;
      }

      const win = t.deliveryWindow || "Not Specified";
      windowCounts[win] = (windowCounts[win] || 0) + 1;

      const dept = t.requestedByDept || "General Logistics";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;

      totalCost += Number(t.totalTripCost || 0);
      totalPlannedKm += Number(t.plannedKm || 0);
      totalActualKm += Number(t.actualKm || 0);

      for (const tr of t.tripRequests || []) {
        if (tr.request) {
          totalKg += Number(tr.request.requiredKg || 0);
          totalCbm += Number(tr.request.requiredCbm || 0);
        }
      }
    }

    return {
      total,
      planned,
      plannedPct: total > 0 ? ((planned / total) * 100).toFixed(1) : "0",
      special,
      specialPct: total > 0 ? ((special / total) * 100).toFixed(1) : "0",
      adhoc,
      adhocPct: total > 0 ? ((adhoc / total) * 100).toFixed(1) : "0",
      company,
      companyPct: total > 0 ? ((company / total) * 100).toFixed(1) : "0",
      windowCounts,
      deptCounts,
      totalCost,
      totalPlannedKm,
      totalActualKm,
      totalKg,
      totalCbm: totalCbm.toFixed(2),
    };
  }, [filteredTrips]);

  return (
    <div className="w-full h-[calc(100vh-80px)] flex flex-col space-y-2 overflow-hidden bg-slate-50 relative">
      {/* COMPACT TOP TOOLBAR: Minimal height, full horizontal space */}
      <div className="bg-white rounded-xl border border-slate-200 px-3 py-2 shadow-xs shrink-0 flex flex-wrap items-center justify-between gap-2">
        {/* Left: Brand Badge + Date Filter (Always Visible) + Filters Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0">
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
            <span>Full Trip Details</span>
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono ml-0.5">
              {filteredTrips.length}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-300 hidden sm:block" />

          {/* Date Filter: Preset Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={dateRangePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>
          </div>

          {/* From Date */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDateRangePreset("CUSTOM");
                setStartDate(e.target.value);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 w-[125px]"
            />
          </div>

          {/* To Date */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDateRangePreset("CUSTOM");
                setEndDate(e.target.value);
              }}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 w-[125px]"
            />
          </div>

          {/* Advanced Filters Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              showAdvancedFilters || activeAdvancedFiltersCount > 0
                ? "bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeAdvancedFiltersCount > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-mono">
                {activeAdvancedFiltersCount}
              </span>
            )}
            {showAdvancedFilters ? (
              <ChevronUp className="w-3 h-3 text-slate-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-500" />
            )}
          </button>

          {(startDate || endDate || activeAdvancedFiltersCount > 0) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-1.5 py-0.5 rounded hover:bg-rose-50 transition"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>

        {/* Right: Tab Controls (Registry vs Analytics), Export Excel, Refresh */}
        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              type="button"
              onClick={() => setActiveTab("REGISTRY")}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeTab === "REGISTRY"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3 h-3" />
              <span>Grid Table</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ANALYTICS")}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                activeTab === "ANALYTICS"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              <span>Analytics</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefreshData}
            disabled={isLoading}
            className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs transition cursor-pointer"
            title="Reload recent trip data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Export to Excel Button */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Download full 360° report as Excel spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE ADVANCED FILTERS PANEL: Only shown when toggled */}
      {showAdvancedFilters && (
        <div className="bg-white rounded-xl border border-indigo-200 p-2.5 shadow-xs shrink-0 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
            {/* 1. Search */}
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Search (Trip/Plate/Driver/Req/GP)
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type keywords..."
                  className="w-full pl-7 pr-2 py-1 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 2. Plant */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Plant
              </label>
              <select
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Plants</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Vehicle */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Vehicle Plate
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicleNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Fleet Type / Basis */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Fleet / Basis
              </label>
              <select
                value={selectedPaymentBasis}
                onChange={(e) => setSelectedPaymentBasis(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="FIXED">Fixed Fleet</option>
                <option value="KM_BASED">KM-Based Fleet</option>
                <option value="ADHOC">Outside Ad-Hoc</option>
              </select>
            </div>

            {/* 5. Delivery Window */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Delivery Window
              </label>
              <select
                value={selectedDeliveryWindow}
                onChange={(e) => setSelectedDeliveryWindow(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Windows</option>
                {masterOptions.deliveryWindows.map((dw) => (
                  <option key={dw.code} value={dw.name}>
                    {dw.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. Planning Type */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Planning Type
              </label>
              <select
                value={selectedPlanningType}
                onChange={(e) => setSelectedPlanningType(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Planning</option>
                {masterOptions.planningTypes.map((pt) => (
                  <option key={pt.code} value={pt.name}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Requested By */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Department
              </label>
              <select
                value={selectedRequestedBy}
                onChange={(e) => setSelectedRequestedBy(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Departments</option>
                {masterOptions.requestedByDepts.map((d) => (
                  <option key={d.code} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 8. Status */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                Trip Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-2 py-1 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="GATE_PASS_ISSUED">GATE_PASS_ISSUED</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="RECONCILED">RECONCILED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 1: FULL DATA GRID (Fills Remaining Screen Height) */}
      {activeTab === "REGISTRY" && (
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Scrollable Table Area: Clear grid lines, NO line merge, NO line wrap */}
          <div className="flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-0 text-left text-xs min-w-[3400px]">
              <thead className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 shadow-xs">
                <tr>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3 w-12 text-center whitespace-nowrap">
                    #
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Trip No
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[120px] whitespace-nowrap">
                    Status
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[120px] whitespace-nowrap">
                    Allocation Date
                  </th>
                  
                  {/* OPERATIONAL / REQUEST DETAILS (STRICT READ-ONLY) */}
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[90px] whitespace-nowrap">
                    Plant
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[220px] whitespace-nowrap">
                    Corridor Route
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[200px] whitespace-nowrap">
                    Pickup Origin
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[220px] whitespace-nowrap">
                    Delivery Destinations
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[200px] whitespace-nowrap">
                    Cargo Description
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[95px] text-center whitespace-nowrap">
                    Boxes
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[110px] text-right whitespace-nowrap">
                    Net Weight
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[100px] text-right whitespace-nowrap">
                    Volume
                  </th>
                  
                  {/* FLEET & DRIVER DETAILS (STRICT READ-ONLY) */}
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[140px] whitespace-nowrap">
                    Vehicle Plate
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Category
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[150px] whitespace-nowrap">
                    Ownership / Basis
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[150px] whitespace-nowrap">
                    Driver
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Driver Mobile
                  </th>
                  
                  {/* GATE PASS & ACTUALS (STRICT READ-ONLY) */}
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[150px] whitespace-nowrap">
                    Gate Passes
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Departure Time
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Completion Time
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[110px] text-right whitespace-nowrap">
                    Planned KM
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[110px] text-right whitespace-nowrap">
                    Actual KM
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[110px] text-right whitespace-nowrap">
                    Variance KM
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[160px] whitespace-nowrap">
                    Variance Reason
                  </th>
                  
                  {/* FINANCIAL / COST DETAILS (STRICT READ-ONLY) */}
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[115px] text-right whitespace-nowrap">
                    Diesel Rate
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[115px] text-right whitespace-nowrap">
                    Fuel Cost
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[115px] text-right whitespace-nowrap">
                    Running Cost
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[115px] text-right whitespace-nowrap">
                    Driver Profit
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[125px] text-right whitespace-nowrap">
                    Fixed Daily Share
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-900 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] text-right whitespace-nowrap">
                    Total Trip Cost
                  </th>
                  
                  {/* DATATEX RECONCILIATION & CLOSURE (STRICT READ-ONLY) */}
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Datatex Status
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[170px] whitespace-nowrap">
                    Commercial Invoices
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[130px] whitespace-nowrap">
                    Completed By
                  </th>

                  {/* EDITABLE CLASSIFICATION & FINAL COLUMNS MOVED TO END */}
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[200px] whitespace-nowrap">
                    Delivery Window ✏️
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[150px] whitespace-nowrap">
                    Planning Type ✏️
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[180px] whitespace-nowrap">
                    Requested By ✏️
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[260px] whitespace-nowrap">
                    Combined Requests
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 border-r border-slate-300 bg-clip-padding py-2.5 px-3.5 min-w-[220px] whitespace-nowrap">
                    Remarks / Notes ✏️
                  </th>
                  <th className="sticky top-0 z-20 bg-slate-200 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b-2 border-slate-400 bg-clip-padding py-2.5 px-2.5 min-w-[70px] text-center whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrips.length === 0 ? (
                  <tr>
                    <td colSpan={37} className="py-16 text-center text-slate-400 border-b border-slate-200 bg-white">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-xs text-slate-600">
                          No delivery trips found matching your current filter criteria.
                        </span>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedTrips.map((t, idx) => {
                    const rowGlobalIndex = (currentPage - 1) * PAGE_SIZE + idx + 1;
                    const reqList = (t.tripRequests || []).map((tr: any) => tr.request).filter(Boolean);
                    const totalBoxes = reqList.reduce((s: number, r: any) => s + (Number(r.boxCount) || 0), 0);
                    const totalKg = reqList.reduce((s: number, r: any) => s + (Number(r.requiredKg) || 0), 0);
                    const totalCbm = reqList.reduce((s: number, r: any) => s + (Number(r.requiredCbm) || 0), 0);
                    const plants = Array.from(new Set(reqList.map((r: any) => r.plant?.code).filter(Boolean))).join(", ");
                    const origins = Array.from(new Set(reqList.map((r: any) => r.fromLocation?.locationName).filter(Boolean))).join("; ");
                    const destinations = Array.from(new Set(reqList.map((r: any) => r.toLocation?.locationName).filter(Boolean))).join("; ");
                    const cargoDescriptions = Array.from(new Set(reqList.map((r: any) => r.itemDescription).filter(Boolean))).join(" | ");
                    const lastRec = t.reconciliations?.[0];

                    const isAdhoc =
                      t.paymentBasis === "ADHOC" ||
                      t.vehicle?.ownershipType === "ADHOC" ||
                      (t.vehicle?.vehicleType || "").toUpperCase().includes("AD-HOC");

                    const isSelected = selectedTrip?.id === t.id;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTrip(t)}
                        title="Click row to open 360° side details drawer"
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/80 font-medium"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        {/* Index */}
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px] whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {rowGlobalIndex}
                        </td>

                        {/* Trip No */}
                        <td className="py-2 px-3.5 font-bold text-slate-900 font-mono whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          <span className="text-blue-600 hover:underline flex items-center gap-1">
                            <span>{t.tripNo}</span>
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-2 px-3.5 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          <StatusBadge status={t.status} />
                        </td>

                        {/* Allocation Date */}
                        <td className="py-2 px-3.5 text-slate-600 whitespace-nowrap text-[11px] border-b border-r border-slate-200 bg-inherit">
                          {t.createdAt
                            ? new Date(t.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* Plant */}
                        <td className="py-2 px-3.5 whitespace-nowrap font-bold text-slate-800 border-b border-r border-slate-200 bg-inherit">
                          {plants || "-"}
                        </td>

                        {/* Route Corridor */}
                        <td className="py-2 px-3.5 whitespace-nowrap font-medium text-slate-800 border-b border-r border-slate-200 bg-inherit" title={t.route?.routeName || ""}>
                          {t.route?.routeName || "Combined Corridor"}
                        </td>

                        {/* Pickup Origin */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 border-b border-r border-slate-200 bg-inherit" title={origins}>
                          {origins || "-"}
                        </td>

                        {/* Delivery Destinations */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 border-b border-r border-slate-200 bg-inherit" title={destinations}>
                          {destinations || "-"}
                        </td>

                        {/* Cargo Description */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 border-b border-r border-slate-200 bg-inherit" title={cargoDescriptions}>
                          {cargoDescriptions || "-"}
                        </td>

                        {/* Boxes */}
                        <td className="py-2 px-3.5 text-center whitespace-nowrap font-bold text-slate-900 border-b border-r border-slate-200 bg-inherit">
                          {totalBoxes || "-"}
                        </td>

                        {/* Net Weight */}
                        <td className="py-2 px-3.5 text-right whitespace-nowrap font-medium text-slate-800 border-b border-r border-slate-200 bg-inherit">
                          {totalKg ? `${formatNumber(totalKg, 0)} kg` : "-"}
                        </td>

                        {/* Volume */}
                        <td className="py-2 px-3.5 text-right whitespace-nowrap text-slate-600 border-b border-r border-slate-200 bg-inherit">
                          {totalCbm ? `${formatNumber(totalCbm, 2)} cbm` : "-"}
                        </td>

                        {/* Vehicle Plate */}
                        <td className="py-2 px-3.5 whitespace-nowrap font-bold text-slate-900 border-b border-r border-slate-200 bg-inherit">
                          {t.vehicle?.vehicleNumber || "Unassigned"}
                        </td>

                        {/* Vehicle Category */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-[11px] text-slate-600 border-b border-r border-slate-200 bg-inherit">
                          {t.vehicle?.vehicleCategory || t.vehicle?.vehicleType || "-"}
                        </td>

                        {/* Ownership / Basis */}
                        <td className="py-2 px-3.5 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {isAdhoc ? (
                            <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px] border border-amber-200">
                              Outside Ad-Hoc
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium text-[11px]">
                              {t.paymentBasis || "KM_BASED"}
                            </span>
                          )}
                        </td>

                        {/* Driver */}
                        <td className="py-2 px-3.5 whitespace-nowrap font-medium text-slate-900 border-b border-r border-slate-200 bg-inherit">
                          {t.driver?.name || "Unassigned"}
                        </td>

                        {/* Driver Mobile */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px] border-b border-r border-slate-200 bg-inherit">
                          {t.driver?.mobile || "-"}
                        </td>

                        {/* Gate Passes */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-[11px] border-b border-r border-slate-200 bg-inherit">
                          {t.gatePasses && t.gatePasses.length > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-800 font-mono font-bold">
                              {t.gatePasses.map((g: any) => g.gatePassNo).join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        {/* Departure Time */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 text-[11px] border-b border-r border-slate-200 bg-inherit">
                          {t.actualStart
                            ? new Date(t.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "-"}
                        </td>

                        {/* Completion Time */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 text-[11px] border-b border-r border-slate-200 bg-inherit">
                          {t.actualEnd
                            ? new Date(t.actualEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "-"}
                        </td>

                        {/* Planned KM */}
                        <td className="py-2 px-3.5 text-right font-mono font-medium text-slate-700 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {formatNumber(t.plannedKm || 0, 1)} km
                        </td>

                        {/* Actual KM */}
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.actualKm ? `${formatNumber(t.actualKm, 1)} km` : "-"}
                        </td>

                        {/* Variance KM */}
                        <td className="py-2 px-3.5 text-right font-mono whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.varianceKm !== null && t.varianceKm !== undefined ? (
                            <span className={Number(t.varianceKm) > 0 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                              {Number(t.varianceKm) > 0 ? `+${formatNumber(t.varianceKm, 1)}` : formatNumber(t.varianceKm, 1)} km
                            </span>
                          ) : "-"}
                        </td>

                        {/* Variance Reason */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-500 text-[11px] border-b border-r border-slate-200 bg-inherit" title={t.varianceReason || ""}>
                          {t.varianceReason || "-"}
                        </td>

                        {/* Diesel Rate */}
                        <td className="py-2 px-3.5 text-right font-mono text-slate-600 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.dieselRateApplied ? `Rs. ${formatNumber(t.dieselRateApplied, 2)}` : "-"}
                        </td>

                        {/* Fuel Cost */}
                        <td className="py-2 px-3.5 text-right font-mono text-slate-700 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.fuelCost ? `Rs. ${formatNumber(t.fuelCost, 2)}` : "-"}
                        </td>

                        {/* Running Cost */}
                        <td className="py-2 px-3.5 text-right font-mono text-slate-700 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.runningCost ? `Rs. ${formatNumber(t.runningCost, 2)}` : "-"}
                        </td>

                        {/* Driver Profit */}
                        <td className="py-2 px-3.5 text-right font-mono text-slate-700 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.driverProfit ? `Rs. ${formatNumber(t.driverProfit, 2)}` : "-"}
                        </td>

                        {/* Fixed Daily Share */}
                        <td className="py-2 px-3.5 text-right font-mono text-slate-700 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.fixedDailyCost ? `Rs. ${formatNumber(t.fixedDailyCost, 2)}` : "-"}
                        </td>

                        {/* Total Trip Cost */}
                        <td className="py-2 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {t.totalTripCost ? `Rs. ${formatNumber(t.totalTripCost, 2)}` : "-"}
                        </td>

                        {/* Datatex Reconciled Status */}
                        <td className="py-2 px-3.5 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          {lastRec ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              lastRec.matchStatus === "MATCHED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {lastRec.matchStatus || "RECONCILED"}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">PENDING</span>
                          )}
                        </td>

                        {/* Commercial Invoices */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px] border-b border-r border-slate-200 bg-inherit" title={lastRec?.invoiceNumbers || ""}>
                          {lastRec?.invoiceNumbers || "-"}
                        </td>

                        {/* Completed By User */}
                        <td className="py-2 px-3.5 whitespace-nowrap text-slate-600 text-[11px] border-b border-r border-slate-200 bg-inherit">
                          {t.completedByUser?.name || "-"}
                        </td>

                        {/* 1. EDITABLE: Delivery Window */}
                        <td
                          className="py-1 px-2.5 border-b border-r border-slate-200 bg-inherit whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={t.deliveryWindow || ""}
                            onChange={(e) =>
                              handleUpdateClassification(t.id, "deliveryWindow", e.target.value)
                            }
                            disabled={savingId === t.id}
                            className="w-full text-[11px] font-semibold bg-white border border-slate-300 hover:border-slate-400 rounded py-1 px-1.5 focus:ring-1 focus:ring-slate-400 outline-none text-slate-800 transition"
                          >
                            <option value="">-- Select Window --</option>
                            {masterOptions.deliveryWindows.map((dw) => (
                              <option key={dw.code} value={dw.name}>
                                {dw.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 2. EDITABLE: Planning Type */}
                        <td
                          className="py-1 px-2.5 border-b border-r border-slate-200 bg-inherit whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={t.planningType || "Planned"}
                            onChange={(e) =>
                              handleUpdateClassification(t.id, "planningType", e.target.value)
                            }
                            disabled={savingId === t.id}
                            className={`w-full text-[11px] font-bold border rounded py-1 px-1.5 focus:ring-1 focus:ring-slate-400 outline-none transition ${
                              (t.planningType || "").toLowerCase() === "special"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-white text-slate-800 border-slate-300 hover:border-slate-400"
                            }`}
                          >
                            {masterOptions.planningTypes.map((pt) => (
                              <option key={pt.code} value={pt.name}>
                                {pt.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* 3. EDITABLE: Requested By Dept */}
                        <td
                          className="py-1 px-2.5 border-b border-r border-slate-200 bg-inherit whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={t.requestedByDept || ""}
                            onChange={(e) =>
                              handleUpdateClassification(t.id, "requestedByDept", e.target.value)
                            }
                            disabled={savingId === t.id}
                            className="w-full text-[11px] font-medium bg-white border border-slate-300 hover:border-slate-400 rounded py-1 px-1.5 focus:ring-1 focus:ring-slate-400 outline-none text-slate-800 transition"
                          >
                            <option value="">-- General Logistics --</option>
                            {masterOptions.requestedByDepts.map((d) => (
                              <option key={d.code} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Request Codes (Strictly Single-line, No multiple lines) */}
                        <td className="py-2 px-3.5 whitespace-nowrap border-b border-r border-slate-200 bg-inherit font-mono text-[11px] text-slate-700">
                          {reqList.length > 0 ? (
                            <span>{reqList.map((r: any) => r.requestCode).join(", ")}</span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* 4. EDITABLE: Remarks / Notes */}
                        <td className="py-1 px-3 whitespace-nowrap border-b border-r border-slate-200 bg-inherit">
                          <span className="text-slate-700 text-[11px]">
                            {t.adminRemarks || <span className="text-slate-400 italic">No notes</span>}
                          </span>
                        </td>

                        {/* Action Link to Manifest */}
                        <td
                          className="py-2 px-2.5 text-center whitespace-nowrap border-b border-slate-200 bg-inherit"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/trips/${t.id}`}
                            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 inline-flex items-center justify-center transition"
                            title="Open Trip Manifest Slip"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PINNED PAGINATION CONTROLS BAR: Exactly 200 items per page */}
          <div className="bg-slate-50 text-slate-700 px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs border-t border-slate-200">
            {/* Record Summary */}
            <div className="text-slate-600 text-[11px]">
              Showing{" "}
              <span className="font-bold text-slate-900">
                {filteredTrips.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-bold text-slate-900">
                {Math.min(currentPage * PAGE_SIZE, filteredTrips.length)}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-900">{filteredTrips.length}</span> trips
              <span className="text-slate-400 ml-2">({PAGE_SIZE} per page)</span>
            </div>

            {/* Pagination Navigation */}
            <div className="flex items-center gap-1">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Indicator */}
              <span className="px-2 text-[11px] font-semibold text-slate-600">
                Page <span className="text-slate-900 font-bold">{currentPage}</span> of{" "}
                <span className="text-slate-900 font-bold">{totalPages}</span>
              </span>

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: TRIP INTELLIGENCE & VISUAL ANALYTICS */}
      {activeTab === "ANALYTICS" && (
        <div className="flex-1 overflow-auto p-3 space-y-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          {/* 1. Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Total Trips */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Trips
              </span>
              <div className="text-xl font-black text-slate-900 tracking-tight">
                {analyticsData.total}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Filtered Period</span>
            </div>

            {/* Planned Trips */}
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                Planned Trips
              </span>
              <div className="text-xl font-black text-emerald-700 tracking-tight">
                {analyticsData.planned}
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                {analyticsData.plannedPct}% of Total
              </span>
            </div>

            {/* Special Trips */}
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                Special Trips
              </span>
              <div className="text-xl font-black text-amber-700 tracking-tight">
                {analyticsData.special}
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded">
                {analyticsData.specialPct}% Urgent
              </span>
            </div>

            {/* Outside Ad-Hoc Hires */}
            <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-200">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                Ad-Hoc Hires
              </span>
              <div className="text-xl font-black text-purple-700 tracking-tight">
                {analyticsData.adhoc}
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100/60 px-1.5 py-0.2 rounded">
                {analyticsData.adhocPct}% Outside
              </span>
            </div>

            {/* Total Trip Cost */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Total Spend
              </span>
              <div className="text-xl font-black text-blue-800 tracking-tight">
                Rs. {formatNumber(analyticsData.totalCost, 0)}
              </div>
              <span className="text-[10px] text-blue-600 font-medium">All combined trips</span>
            </div>

            {/* Total Volume & KM */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Distance
              </span>
              <div className="text-xl font-black text-slate-800 tracking-tight">
                {formatNumber(analyticsData.totalActualKm || analyticsData.totalPlannedKm, 0)} km
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                {formatNumber(analyticsData.totalKg, 0)} kg cargo
              </span>
            </div>
          </div>

          {/* 2. Visual Charts & Breakdown Grids */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Delivery Window Distribution */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Delivery Windows &amp; Shifts</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400">
                  {analyticsData.total} trips
                </span>
              </div>
              <div className="space-y-2.5">
                {Object.entries(analyticsData.windowCounts).map(([wName, count]) => {
                  const pct = analyticsData.total > 0 ? ((count / analyticsData.total) * 100).toFixed(1) : "0";
                  return (
                    <div key={wName} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-slate-700">{wName}</span>
                        <span className="text-slate-900 font-bold font-mono">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Planning Type vs Adhoc Distribution */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Planning &amp; Fleet Roster Mix</span>
                </h3>
              </div>
              <div className="space-y-3">
                {/* Planned vs Special */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">Planning Type Split</span>
                  <div className="flex h-3 rounded-full overflow-hidden w-full">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${analyticsData.plannedPct}%` }}
                      title={`Planned: ${analyticsData.plannedPct}%`}
                    />
                    <div
                      className="bg-amber-500"
                      style={{ width: `${analyticsData.specialPct}%` }}
                      title={`Special: ${analyticsData.specialPct}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      Planned: <strong>{analyticsData.planned}</strong> ({analyticsData.plannedPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      Special: <strong>{analyticsData.special}</strong> ({analyticsData.specialPct}%)
                    </span>
                  </div>
                </div>

                {/* Fleet vs Outside Adhoc */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 block">Fleet Sourcing</span>
                  <div className="flex h-3 rounded-full overflow-hidden w-full">
                    <div
                      className="bg-indigo-600"
                      style={{ width: `${analyticsData.companyPct}%` }}
                      title={`Company Fleet: ${analyticsData.companyPct}%`}
                    />
                    <div
                      className="bg-purple-500"
                      style={{ width: `${analyticsData.adhocPct}%` }}
                      title={`Outside Ad-Hoc: ${analyticsData.adhocPct}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                      Company Fleet: <strong>{analyticsData.company}</strong> ({analyticsData.companyPct}%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                      Ad-Hoc: <strong>{analyticsData.adhoc}</strong> ({analyticsData.adhocPct}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Requested By Department</span>
                </h3>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-auto pr-1">
                {Object.entries(analyticsData.deptCounts).map(([dName, count]) => {
                  const pct = analyticsData.total > 0 ? ((count / analyticsData.total) * 100).toFixed(1) : "0";
                  return (
                    <div key={dName} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                      <span className="text-slate-700 font-medium truncate max-w-[160px]">{dName}</span>
                      <span className="text-slate-900 font-bold font-mono">
                        {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROW-CLICK SIDE DRAWER POPUP OVERLAY */}
      {selectedTrip && (
        <>
          {/* Backdrop (Clicking outside auto-closes drawer) */}
          <div
            onClick={() => setSelectedTrip(null)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-150"
          />

          {/* Side Drawer Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[680px] md:w-[780px] lg:w-[860px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold font-mono">{selectedTrip.tripNo}</h2>
                    <StatusBadge status={selectedTrip.status} />
                  </div>
                  <span className="text-[11px] text-slate-300">
                    Allocated on{" "}
                    {selectedTrip.createdAt
                      ? new Date(selectedTrip.createdAt).toLocaleDateString()
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Link
                  href={`/allocations/fg/combine/${selectedTrip.id}`}
                  className="px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 transition"
                  title="Open in Combine Workbench"
                >
                  <span>Workbench</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                <Link
                  href={`/trips/${selectedTrip.id}`}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1 transition"
                  title="Open Trip Manifest"
                >
                  <Eye className="w-3 h-3" />
                  <span>Manifest</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedTrip(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* SECTION 1: QUICK INLINE CLASSIFICATION & EDIT (At Top) */}
              <div className="bg-indigo-50/80 rounded-xl border border-indigo-200 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Quick Classification &amp; Operational Notes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Delivery Window */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Delivery Window
                    </label>
                    <select
                      value={selectedTrip.deliveryWindow || ""}
                      onChange={(e) =>
                        handleUpdateClassification(selectedTrip.id, "deliveryWindow", e.target.value)
                      }
                      className="w-full bg-white border border-indigo-300 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- Select Window --</option>
                      {masterOptions.deliveryWindows.map((dw) => (
                        <option key={dw.code} value={dw.name}>
                          {dw.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Planning Type */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Planning Category
                    </label>
                    <select
                      value={selectedTrip.planningType || "Planned"}
                      onChange={(e) =>
                        handleUpdateClassification(selectedTrip.id, "planningType", e.target.value)
                      }
                      className="w-full bg-white border border-indigo-300 rounded-lg py-1.5 px-2 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      {masterOptions.planningTypes.map((pt) => (
                        <option key={pt.code} value={pt.name}>
                          {pt.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Requested By */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Requested By Dept
                    </label>
                    <select
                      value={selectedTrip.requestedByDept || ""}
                      onChange={(e) =>
                        handleUpdateClassification(selectedTrip.id, "requestedByDept", e.target.value)
                      }
                      className="w-full bg-white border border-indigo-300 rounded-lg py-1.5 px-2 text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none"
                    >
                      <option value="">-- General Logistics --</option>
                      {masterOptions.requestedByDepts.map((d) => (
                        <option key={d.code} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Remarks Textarea */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Trip Remarks / Operational Comment
                  </label>
                  <textarea
                    rows={3}
                    value={drawerRemarksText}
                    onChange={(e) => setDrawerRemarksText(e.target.value)}
                    placeholder="Enter operational notes, loading exceptions, or driver feedback..."
                    className="w-full bg-white border border-indigo-300 rounded-lg p-2 text-xs text-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={handleSaveDrawerRemarks}
                      disabled={savingDrawerRemarks}
                      className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3 h-3" />
                      <span>{savingDrawerRemarks ? "Saving..." : "Save Remarks"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: COMBINED REQUISITIONS & CARGO */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Package className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Combined Orders &amp; Cargo Manifest</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {(selectedTrip.tripRequests || []).length} Orders
                  </span>
                </div>

                <div className="space-y-2">
                  {(selectedTrip.tripRequests || []).map((tr: any, rIdx: number) => {
                    const req = tr.request;
                    if (!req) return null;
                    return (
                      <div
                        key={req.id || rIdx}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/requests/${req.id}`}
                            className="font-bold text-indigo-700 hover:underline font-mono text-xs flex items-center gap-1"
                          >
                            <span>{req.requestCode}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                          <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                            {req.plant?.code || "Plant"}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-800 font-medium">
                          {req.itemDescription || "Cargo Goods"}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <div>
                            Boxes: <strong className="text-slate-800">{req.boxCount || 0}</strong>
                          </div>
                          <div>
                            Weight: <strong className="text-slate-800">{req.requiredKg || 0} kg</strong>
                          </div>
                          <div>
                            Volume: <strong className="text-slate-800">{req.requiredCbm || 0} cbm</strong>
                          </div>
                          <div>
                            Requester: <strong className="text-slate-800">{req.requester?.name || "-"}</strong>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-600 flex items-center gap-1 pt-0.5">
                          <MapPin className="w-2.5 h-2.5 text-slate-400" />
                          <span>{req.fromLocation?.locationName || "Origin"}</span>
                          <span className="text-slate-400">⟶</span>
                          <span>{req.toLocation?.locationName || "Destination"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: FLEET & DRIVER ASSIGNMENT */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-2">
                  <Truck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Fleet Vehicle &amp; Driver Details</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Vehicle Plate</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedTrip.vehicle?.vehicleNumber || "Unassigned"}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedTrip.vehicle?.vehicleCategory || selectedTrip.vehicle?.vehicleType || "-"} (
                      {selectedTrip.paymentBasis || "KM_BASED"})
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Driver</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {selectedTrip.driver?.name || "Unassigned"}
                    </span>
                    {selectedTrip.driver?.mobile && (
                      <span className="text-[10px] text-slate-600 flex items-center gap-1 font-mono">
                        <Phone className="w-2.5 h-2.5" />
                        {selectedTrip.driver.mobile}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 4: GATE PASS & ACTUAL RUN (ODOMETERS) */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-2">
                  <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Gate Passes, Odometers &amp; Variance</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-bold">Planned KM</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatNumber(selectedTrip.plannedKm || 0, 1)} km
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-bold">Actual KM</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {selectedTrip.actualKm ? `${formatNumber(selectedTrip.actualKm, 1)} km` : "-"}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-bold">Variance KM</span>
                    <span className={`font-mono font-bold ${Number(selectedTrip.varianceKm || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                      {selectedTrip.varianceKm ? `${formatNumber(selectedTrip.varianceKm, 1)} km` : "0 km"}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block font-bold">Gate Passes</span>
                    <span className="font-mono font-bold text-indigo-900 truncate block">
                      {(selectedTrip.gatePasses || []).map((g: any) => g.gatePassNo).join(", ") || "None"}
                    </span>
                  </div>
                </div>

                {selectedTrip.varianceReason && (
                  <div className="text-[11px] p-2 bg-amber-50 rounded-lg text-amber-900 border border-amber-200">
                    <strong>Variance Reason:</strong> {selectedTrip.varianceReason}
                  </div>
                )}
              </div>

              {/* SECTION 5: FINANCIAL COST BREAKDOWN */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-2">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Costing &amp; Financial Manifest</span>
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Fuel Cost</span>
                    <span className="font-mono font-bold text-slate-800">
                      Rs. {formatNumber(selectedTrip.fuelCost || 0, 2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Running Maintenance</span>
                    <span className="font-mono font-bold text-slate-800">
                      Rs. {formatNumber(selectedTrip.runningCost || 0, 2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Driver Profit</span>
                    <span className="font-mono font-bold text-slate-800">
                      Rs. {formatNumber(selectedTrip.driverProfit || 0, 2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Daily Fixed Share</span>
                    <span className="font-mono font-bold text-slate-800">
                      Rs. {formatNumber(selectedTrip.fixedDailyCost || 0, 2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-50">
                    <span className="text-[10px] text-slate-400 block">Diesel Rate Applied</span>
                    <span className="font-mono font-bold text-slate-800">
                      Rs. {formatNumber(selectedTrip.dieselRateApplied || 0, 2)}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 font-bold block">Total Trip Cost</span>
                    <span className="font-mono font-black text-emerald-900 text-sm">
                      Rs. {formatNumber(selectedTrip.totalTripCost || 0, 2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 6: DATATEX RECONCILIATION */}
              <div className="bg-white rounded-xl border border-slate-200 p-3.5 space-y-2 shadow-2xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs border-b border-slate-100 pb-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Datatex ERP Settlement</span>
                </span>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Reconciliation Match:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {selectedTrip.reconciliations?.[0]?.matchStatus || "PENDING"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Commercial Invoices:</span>
                  <span className="font-mono text-slate-800">
                    {selectedTrip.reconciliations?.[0]?.invoiceNumbers || "None"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Completed By User:</span>
                  <span className="font-medium text-slate-800">
                    {selectedTrip.completedByUser?.name || "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
