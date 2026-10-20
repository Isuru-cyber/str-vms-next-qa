"use client";

import React, { useState, useMemo } from "react";
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

export function FullTripDetailsClient({
  initialTrips,
  plants,
  vehicles,
  masterOptions,
}: FullTripDetailsClientProps) {
  const [activeTab, setActiveTab] = useState<"REGISTRY" | "ANALYTICS">("REGISTRY");
  const [trips, setTrips] = useState<any[]>(initialTrips);

  // Filters State
  const [search, setSearch] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("ALL");
  const [selectedVehicle, setSelectedVehicle] = useState("ALL");
  const [selectedPaymentBasis, setSelectedPaymentBasis] = useState("ALL");
  const [selectedDeliveryWindow, setSelectedDeliveryWindow] = useState("ALL");
  const [selectedPlanningType, setSelectedPlanningType] = useState("ALL");
  const [selectedRequestedBy, setSelectedRequestedBy] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [dateRangePreset, setDateRangePreset] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Quick Inline Edit State
  const [savingId, setSavingId] = useState<number | null>(null);
  const [remarksModalTrip, setRemarksModalTrip] = useState<any | null>(null);
  const [modalRemarksText, setModalRemarksText] = useState("");
  const [savingRemarks, setSavingRemarks] = useState(false);

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
  };

  // Client-side Filtering
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
        if (
          !tripNoMatch &&
          !vehMatch &&
          !drvMatch &&
          !routeMatch &&
          !reqMatch &&
          !remarksMatch
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

  // Update classification inline
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

      // Update in local state
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, [field]: value } : t))
      );
    } catch (e: any) {
      alert(e.message || "Update failed.");
    } finally {
      setSavingId(null);
    }
  };

  // Save Remarks modal
  const handleSaveRemarks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarksModalTrip) return;
    setSavingRemarks(true);
    try {
      const res = await fetch(`/api/trips/${remarksModalTrip.id}/classification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRemarks: modalRemarksText }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save remarks.");
      }

      setTrips((prev) =>
        prev.map((t) =>
          t.id === remarksModalTrip.id ? { ...t, adminRemarks: modalRemarksText } : t
        )
      );
      setRemarksModalTrip(null);
    } catch (e: any) {
      alert(e.message || "Failed to save remarks.");
    } finally {
      setSavingRemarks(false);
    }
  };

  // Export to Excel (Full 360° Data Grid)
  const handleExportExcel = () => {
    if (filteredTrips.length === 0) {
      alert("No trips to export matching the current filters.");
      return;
    }

    const rows = filteredTrips.map((t, idx) => {
      const reqList = (t.tripRequests || []).map((tr: any) => tr.request).filter(Boolean);
      const reqCodes = reqList.map((r: any) => r.requestCode).join(", ");
      const plants = Array.from(new Set(reqList.map((r: any) => r.plant?.code).filter(Boolean))).join(", ");
      const origins = Array.from(new Set(reqList.map((r: any) => r.fromLocation?.locationName).filter(Boolean))).join("; ");
      const destinations = Array.from(new Set(reqList.map((r: any) => r.toLocation?.locationName).filter(Boolean))).join("; ");
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
        "Delivery Window / Shift": t.deliveryWindow || "Not Specified",
        "Planning Type": t.planningType || "Planned",
        "Requested By Department": t.requestedByDept || "Not Specified",
        "Vehicle Number": t.vehicle?.vehicleNumber || "Unassigned",
        "Vehicle Category": t.vehicle?.vehicleCategory || t.vehicle?.vehicleType || "Standard",
        "Fleet Ownership": isAdhoc ? "Outside Ad-Hoc Hire" : "Company / Contracted Fleet",
        "Driver Name": t.driver?.name || "Unassigned",
        "Driver Mobile": t.driver?.mobile || "",
        "Driver NIC": t.driver?.nic || "",
        "Route Corridor": t.route?.routeName || "Consolidated Route",
        "Origin Plant": plants || "",
        "From Location": origins || "",
        "To Destinations": destinations || "",
        "Request Codes": reqCodes || "",
        "Total Cargo Boxes": totalBoxes,
        "Total Weight (KG)": totalKg,
        "Total Volume (CBM)": parseFloat(totalCbm.toFixed(3)),
        "Gate Pass Numbers": gatePasses || "",
        "Planned KM": Number(t.plannedKm || 0),
        "Actual KM (Running Sheet)": Number(t.actualKm || 0),
        "Variance KM": Number(t.varianceKm || 0),
        "Variance Reason": t.varianceReason || "",
        "Payment Basis": t.paymentBasis || (isAdhoc ? "ADHOC" : "KM_BASED"),
        "Diesel Rate (Rs)": Number(t.dieselRateApplied || 0),
        "Fuel Cost (Rs)": Number(t.fuelCost || 0),
        "Running Cost (Rs)": Number(t.runningCost || 0),
        "Driver Profit (Rs)": Number(t.driverProfit || 0),
        "Daily Fixed Cost Share (Rs)": Number(t.fixedDailyCost || 0),
        "Total Trip Cost (Rs)": Number(t.totalTripCost || 0),
        "Datatex Reconciled Status": lastRec?.matchStatus || "PENDING",
        "Datatex Commercial Invoices": lastRec?.invoiceNumbers || "",
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
      if (p.includes("special")) special++;
      else planned++;

      const isAdhoc =
        t.paymentBasis === "ADHOC" ||
        t.vehicle?.ownershipType === "ADHOC" ||
        (t.vehicle?.vehicleType || "").toUpperCase().includes("AD-HOC");
      if (isAdhoc) adhoc++;
      else company++;

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
    <div className="space-y-5 w-full max-w-[1600px] mx-auto pb-16 px-2 sm:px-4">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Full Trip Details &amp; Operational Master Report
              </h1>
              <p className="text-xs text-slate-500">
                End-to-end 360° manifest data, shift classifications, and fleet analytics
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Tab Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("REGISTRY")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "REGISTRY"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Master Registry ({filteredTrips.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ANALYTICS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "ANALYTICS"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Trip Intelligence &amp; Analytics</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Download full 35-column master report as Excel spreadsheet"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs">
          {/* 1. Date Range Preset */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Date Preset
            </label>
            <select
              value={dateRangePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Recorded Dates</option>
              <option value="TODAY">Today</option>
              <option value="YESTERDAY">Yesterday</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
            </select>
          </div>

          {/* 2. From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setDateRangePreset("CUSTOM");
                setStartDate(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* 3. To Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setDateRangePreset("CUSTOM");
                setEndDate(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* 4. Plant Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Factory Plant
            </label>
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Plants</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Fleet / Vehicle */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Vehicle Plate
            </label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Fleet Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleNumber} ({v.ownershipType === "ADHOC" ? "Ad-Hoc" : "Fleet"})
                </option>
              ))}
            </select>
          </div>

          {/* 6. Payment Basis */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Payment Basis
            </label>
            <select
              value={selectedPaymentBasis}
              onChange={(e) => setSelectedPaymentBasis(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Basis</option>
              <option value="FIXED">Fixed Fleet</option>
              <option value="KM_BASED">KM-Based Fleet</option>
              <option value="ADHOC">Outside Ad-Hoc Hires</option>
            </select>
          </div>

          {/* 7. Delivery Window Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Delivery Window
            </label>
            <select
              value={selectedDeliveryWindow}
              onChange={(e) => setSelectedDeliveryWindow(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Windows</option>
              {masterOptions.deliveryWindows.map((dw) => (
                <option key={dw.code} value={dw.name}>
                  {dw.name}
                </option>
              ))}
            </select>
          </div>

          {/* 8. Planning Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Planning Category
            </label>
            <select
              value={selectedPlanningType}
              onChange={(e) => setSelectedPlanningType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Categories</option>
              {masterOptions.planningTypes.map((pt) => (
                <option key={pt.code} value={pt.name}>
                  {pt.name}
                </option>
              ))}
            </select>
          </div>

          {/* 9. Requested By Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Requested By Dept
            </label>
            <select
              value={selectedRequestedBy}
              onChange={(e) => setSelectedRequestedBy(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Departments</option>
              {masterOptions.requestedByDepts.map((d) => (
                <option key={d.code} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* 10. Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Trip Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ASSIGNED">ASSIGNED (In Workbench)</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="RECONCILED">RECONCILED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* 11. Search Box */}
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Search Trip, Plate, Driver or Request
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trip no, vehicle, driver..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{filteredTrips.length}</strong> of {trips.length} total delivery trips.
            </span>
            {(startDate || endDate || selectedPlant !== "ALL" || selectedVehicle !== "ALL" || selectedPaymentBasis !== "ALL" || selectedDeliveryWindow !== "ALL" || selectedPlanningType !== "ALL" || selectedRequestedBy !== "ALL" || selectedStatus !== "ALL" || search) && (
              <span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                Filters Active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-slate-600 hover:text-rose-600 font-bold flex items-center gap-1 cursor-pointer transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: MASTER REGISTRY TABLE */}
      {activeTab === "REGISTRY" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider divide-x divide-slate-800">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 min-w-[130px]">Trip No</th>
                  <th className="py-3 px-3 min-w-[110px]">Status</th>
                  <th className="py-3 px-3 min-w-[100px]">Date</th>
                  <th className="py-3 px-3 min-w-[180px] bg-indigo-950/80">
                    Delivery Window
                  </th>
                  <th className="py-3 px-3 min-w-[130px] bg-indigo-950/80">
                    Planning Category
                  </th>
                  <th className="py-3 px-3 min-w-[170px] bg-indigo-950/80">
                    Requested By
                  </th>
                  <th className="py-3 px-3 min-w-[130px]">Vehicle</th>
                  <th className="py-3 px-3 min-w-[140px]">Driver</th>
                  <th className="py-3 px-3 min-w-[180px]">Corridor Route</th>
                  <th className="py-3 px-3 min-w-[120px] text-center">Cargo (Box/Kg)</th>
                  <th className="py-3 px-3 min-w-[90px] text-right">Planned KM</th>
                  <th className="py-3 px-3 min-w-[90px] text-right">Actual KM</th>
                  <th className="py-3 px-3 min-w-[110px] text-right">Trip Cost (Rs)</th>
                  <th className="py-3 px-3 min-w-[120px]">Gate Passes</th>
                  <th className="py-3 px-3 min-w-[160px]">Remarks / Note</th>
                  <th className="py-3 px-3 w-16 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-xs text-slate-600">
                          No delivery trips found matching your current filter criteria.
                        </span>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((t, idx) => {
                    const reqList = (t.tripRequests || []).map((tr: any) => tr.request).filter(Boolean);
                    const totalBoxes = reqList.reduce((s: number, r: any) => s + (Number(r.boxCount) || 0), 0);
                    const totalKg = reqList.reduce((s: number, r: any) => s + (Number(r.requiredKg) || 0), 0);
                    const isAdhoc =
                      t.paymentBasis === "ADHOC" ||
                      t.vehicle?.ownershipType === "ADHOC" ||
                      (t.vehicle?.vehicleType || "").toUpperCase().includes("AD-HOC");

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-slate-50/80 transition-colors divide-x divide-slate-100"
                      >
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>

                        {/* Trip No */}
                        <td className="py-2.5 px-3 font-bold text-slate-900 font-mono whitespace-nowrap">
                          <Link
                            href={`/trips/${t.id}`}
                            className="text-indigo-600 hover:underline flex items-center gap-1"
                            title="Open Manifest View"
                          >
                            <span>{t.tripNo}</span>
                          </Link>
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StatusBadge status={t.status} />
                        </td>

                        {/* Date */}
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap text-[11px]">
                          {t.createdAt
                            ? new Date(t.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "-"}
                        </td>

                        {/* INLINE EDIT: Delivery Window */}
                        <td className="py-2 px-2 bg-indigo-50/30">
                          <select
                            value={t.deliveryWindow || ""}
                            onChange={(e) =>
                              handleUpdateClassification(t.id, "deliveryWindow", e.target.value)
                            }
                            disabled={savingId === t.id}
                            className="w-full text-[11px] font-semibold bg-white border border-indigo-200 rounded-md py-1 px-1.5 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                          >
                            <option value="">-- Select Window --</option>
                            {masterOptions.deliveryWindows.map((dw) => (
                              <option key={dw.code} value={dw.name}>
                                {dw.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* INLINE EDIT: Planning Type */}
                        <td className="py-2 px-2 bg-indigo-50/30">
                          <select
                            value={t.planningType || "Planned"}
                            onChange={(e) =>
                              handleUpdateClassification(t.id, "planningType", e.target.value)
                            }
                            disabled={savingId === t.id}
                            className={`w-full text-[11px] font-bold border rounded-md py-1 px-1.5 focus:ring-1 focus:ring-indigo-500 outline-none ${
                              (t.planningType || "").toLowerCase() === "special"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-white text-slate-800 border-indigo-200"
                            }`}
                          >
                            {masterOptions.planningTypes.map((pt) => (
                              <option key={pt.code} value={pt.name}>
                                {pt.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* INLINE EDIT: Requested By */}
                        <td className="py-2 px-2 bg-indigo-50/30">
                          <select
                            value={t.requestedByDept || ""}
                            onChange={(e) =>
                              handleUpdateClassification(t.id, "requestedByDept", e.target.value)
                            }
                            disabled={savingId === t.id}
                            className="w-full text-[11px] font-medium bg-white border border-indigo-200 rounded-md py-1 px-1.5 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800"
                          >
                            <option value="">-- General Logistics --</option>
                            {masterOptions.requestedByDepts.map((d) => (
                              <option key={d.code} value={d.name}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Vehicle */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">
                              {t.vehicle?.vehicleNumber || "Unassigned"}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {isAdhoc ? (
                                <span className="text-amber-700 font-semibold bg-amber-50 px-1 rounded">
                                  Outside Ad-Hoc
                                </span>
                              ) : (
                                t.vehicle?.vehicleCategory || t.vehicle?.vehicleType || "Company"
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Driver */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">
                              {t.driver?.name || "Unassigned"}
                            </span>
                            {t.driver?.mobile && (
                              <span className="text-[10px] text-slate-400">
                                {t.driver.mobile}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Route Corridor */}
                        <td className="py-2.5 px-3 max-w-[200px] truncate" title={t.route?.routeName || ""}>
                          <span className="font-medium text-slate-800">
                            {t.route?.routeName || "Combined Corridor"}
                          </span>
                        </td>

                        {/* Cargo (Boxes/KG) */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="font-bold text-slate-900">{totalBoxes} bxs</span>
                          <span className="text-[10px] text-slate-500 block">
                            {totalKg ? `${formatNumber(totalKg, 0)} kg` : "-"}
                          </span>
                        </td>

                        {/* Planned KM */}
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                          {formatNumber(t.plannedKm || 0, 1)} km
                        </td>

                        {/* Actual KM */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {t.actualKm ? `${formatNumber(t.actualKm, 1)} km` : "-"}
                        </td>

                        {/* Total Trip Cost */}
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {t.totalTripCost ? `Rs. ${formatNumber(t.totalTripCost, 2)}` : "-"}
                        </td>

                        {/* Gate Passes */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-[11px]">
                          {t.gatePasses && t.gatePasses.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-mono font-bold">
                              {t.gatePasses.map((g: any) => g.gatePassNo).join(", ")}
                            </span>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        {/* Remarks */}
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate text-slate-700 text-[11px]" title={t.adminRemarks || ""}>
                              {t.adminRemarks || <span className="text-slate-400 italic">No notes</span>}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setRemarksModalTrip(t);
                                setModalRemarksText(t.adminRemarks || "");
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 cursor-pointer transition shrink-0"
                              title="Edit Remarks"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Action Link */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <Link
                            href={`/trips/${t.id}`}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 inline-flex items-center justify-center transition"
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
        </div>
      )}

      {/* TAB CONTENT 2: TRIP INTELLIGENCE & VISUAL ANALYTICS */}
      {activeTab === "ANALYTICS" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* 1. Executive KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* Total Trips */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Trips
              </span>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {analyticsData.total}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Filtered Period</span>
            </div>

            {/* Planned Trips */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                Planned Trips
              </span>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {analyticsData.planned}
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {analyticsData.plannedPct}% of Total
              </span>
            </div>

            {/* Special Trips */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                Special Trips
              </span>
              <div className="text-2xl font-black text-amber-700 tracking-tight">
                {analyticsData.special}
              </div>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                {analyticsData.specialPct}% Urgent / Adhoc
              </span>
            </div>

            {/* Outside Ad-Hoc Hires */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider block mb-1">
                Ad-Hoc Hires
              </span>
              <div className="text-2xl font-black text-purple-700 tracking-tight">
                {analyticsData.adhoc}
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">
                {analyticsData.adhocPct}% Outside Fleet
              </span>
            </div>

            {/* Total Actual KM */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                Total Run KM
              </span>
              <div className="text-2xl font-black text-blue-800 tracking-tight font-mono">
                {formatNumber(analyticsData.totalActualKm, 0)}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Logged Distance</span>
            </div>

            {/* Total Logistics Spend */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mb-1">
                Total Spend
              </span>
              <div className="text-lg font-black text-indigo-900 tracking-tight font-mono truncate">
                Rs. {formatNumber(analyticsData.totalCost, 0)}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Calculated Cost</span>
            </div>
          </div>

          {/* 2. Visual Distributions & Comparison Matrices */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Box 1: Planning Ratio (Planned vs Special) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Planning Ratio (Planned vs Special)
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  {analyticsData.total} Trips
                </span>
              </div>

              {/* Graphical Bar */}
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${analyticsData.plannedPct}%` }}
                  className="bg-emerald-500 h-full transition-all"
                  title={`Planned: ${analyticsData.plannedPct}%`}
                />
                <div
                  style={{ width: `${analyticsData.specialPct}%` }}
                  className="bg-amber-500 h-full transition-all"
                  title={`Special: ${analyticsData.specialPct}%`}
                />
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="font-bold text-emerald-900">Planned Regular Runs</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-950 block">{analyticsData.planned} trips</span>
                    <span className="text-[10px] text-emerald-700">{analyticsData.plannedPct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="font-bold text-amber-900">Special / Emergency Runs</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-950 block">{analyticsData.special} trips</span>
                    <span className="text-[10px] text-amber-700">{analyticsData.specialPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Box 2: Delivery Window Utilization */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Delivery Window Shift Utilization
                </h3>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                {Object.entries(analyticsData.windowCounts).map(([win, count]) => {
                  const pct =
                    analyticsData.total > 0
                      ? ((count / analyticsData.total) * 100).toFixed(1)
                      : "0";
                  return (
                    <div key={win} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">{win}</span>
                        <span className="font-mono text-slate-500">
                          <strong>{count}</strong> trips ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full rounded-full transition-all ${
                            win.includes("Morning")
                              ? "bg-indigo-600"
                              : win.includes("Evening")
                              ? "bg-blue-500"
                              : win.includes("Overnight")
                              ? "bg-purple-600"
                              : "bg-slate-400"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Box 3: Fleet Ownership Split (Company vs Ad-Hoc) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600" />
                  Fleet Ownership Split
                </h3>
              </div>

              {/* Graphical Bar */}
              <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${analyticsData.companyPct}%` }}
                  className="bg-blue-600 h-full transition-all"
                  title={`Company Fleet: ${analyticsData.companyPct}%`}
                />
                <div
                  style={{ width: `${analyticsData.adhocPct}%` }}
                  className="bg-purple-500 h-full transition-all"
                  title={`Outside Ad-Hoc: ${analyticsData.adhocPct}%`}
                />
              </div>

              <div className="space-y-3 pt-1 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span className="font-bold text-blue-900">Company Contracted Fleet</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-blue-950 block">{analyticsData.company} trips</span>
                    <span className="text-[10px] text-blue-700">{analyticsData.companyPct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-500" />
                    <span className="font-bold text-purple-900">Outside Ad-Hoc Hires</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-purple-950 block">{analyticsData.adhoc} trips</span>
                    <span className="text-[10px] text-purple-700">{analyticsData.adhocPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT OPERATIONAL REMARKS */}
      {remarksModalTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm tracking-tight">
                  Operational Remarks — {remarksModalTrip.tripNo}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRemarksModalTrip(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRemarks} className="p-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Trip Operational Comment &amp; Audit Log Note
                </label>
                <textarea
                  value={modalRemarksText}
                  onChange={(e) => setModalRemarksText(e.target.value)}
                  placeholder="Type administrative or operational comments for this trip here..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-800"
                />
                <span className="text-[10px] text-slate-400">
                  This note will appear in the Master Grid and exports directly in the Excel file.
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRemarksModalTrip(null)}
                  disabled={savingRemarks}
                  className="h-8 px-3 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRemarks}
                  className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingRemarks ? "Saving..." : "Save Remarks"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
