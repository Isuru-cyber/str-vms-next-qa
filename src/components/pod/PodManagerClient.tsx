"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Download,
  RotateCcw,
  Truck,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Save,
  CheckSquare,
  Square,
  ChevronRight,
  Building2,
  Percent,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import * as XLSX from "xlsx";

export interface PodInvoiceItem {
  id: string | number;
  dbId: number | null;
  tripId: number;
  tripNo: string;
  tripStatus?: string;
  requestId: number;
  requestCode: string;
  invoiceNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverMobile: string;
  locationName: string;
  plantCode: string;
  dispatchedDate: string;
  isReceived: boolean;
  receivedAt: string | null;
  receivedByName: string | null;
  remarks: string;
}

interface PodManagerClientProps {
  initialInvoices: PodInvoiceItem[];
  initialStats: {
    totalInvoices: number;
    receivedCount: number;
    pendingCount: number;
    returnRate: number;
  };
}

export const PodManagerClient: React.FC<PodManagerClientProps> = ({
  initialInvoices,
  initialStats,
}) => {
  const [invoices, setInvoices] = useState<PodInvoiceItem[]>(initialInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<"ALL" | "PENDING" | "RECEIVED">("ALL");
  const [selectedPlant, setSelectedPlant] = useState<string>("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"TRIP_WISE" | "INVOICE_WISE">("TRIP_WISE");
  const [expandedTrips, setExpandedTrips] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [remarksMap, setRemarksMap] = useState<Record<string | number, string>>({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dynamic KPI Stats calculated from current state
  const stats = useMemo(() => {
    const total = invoices.length;
    const received = invoices.filter((i) => i.isReceived).length;
    const pending = total - received;
    const rate = total > 0 ? Math.round((received / total) * 100) : 100;
    return {
      totalInvoices: total,
      receivedCount: received,
      pendingCount: pending,
      returnRate: rate,
    };
  }, [invoices]);

  // Unique plants for dropdown filter
  const plants = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((i) => {
      if (i.plantCode) set.add(i.plantCode);
    });
    return Array.from(set).sort();
  }, [invoices]);

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          item.invoiceNumber.toLowerCase().includes(q) ||
          item.tripNo.toLowerCase().includes(q) ||
          item.requestCode.toLowerCase().includes(q) ||
          item.vehicleNumber.toLowerCase().includes(q) ||
          item.driverName.toLowerCase().includes(q) ||
          item.locationName.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // 2. Status Tab Filter
      if (statusTab === "PENDING" && item.isReceived) return false;
      if (statusTab === "RECEIVED" && !item.isReceived) return false;

      // 3. Plant Filter
      if (selectedPlant !== "ALL" && item.plantCode !== selectedPlant) return false;

      // 4. Date Range Filter
      if (selectedDateRange !== "ALL") {
        const itemDate = new Date(item.dispatchedDate);
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        if (selectedDateRange === "TODAY" && item.dispatchedDate !== todayStr) {
          return false;
        }

        if (selectedDateRange === "THIS_WEEK") {
          const dayOfWeek = now.getDay() || 7;
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - dayOfWeek + 1);
          weekStart.setHours(0, 0, 0, 0);
          if (itemDate < weekStart) return false;
        }

        if (selectedDateRange === "THIS_MONTH") {
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          if (itemDate < monthStart) return false;
        }
      }

      return true;
    });
  }, [invoices, searchQuery, statusTab, selectedPlant, selectedDateRange]);

  // Group invoices into Delivery Trips for Trip-wise Master-Detail Perspective
  const tripGroups = useMemo(() => {
    const map = new Map<number, {
      tripId: number;
      tripNo: string;
      tripStatus?: string;
      vehicleNumber: string;
      vehicleType: string;
      driverName: string;
      driverMobile: string;
      plantCode: string;
      dispatchedDate: string;
      invoices: PodInvoiceItem[];
      totalInvoices: number;
      receivedInvoices: number;
      completionRate: number;
      podStatus: "PENDING" | "PARTIAL_COMPLETED" | "COMPLETED";
    }>();

    filteredInvoices.forEach((inv) => {
      let group = map.get(inv.tripId);
      if (!group) {
        group = {
          tripId: inv.tripId,
          tripNo: inv.tripNo,
          tripStatus: inv.tripStatus,
          vehicleNumber: inv.vehicleNumber,
          vehicleType: inv.vehicleType,
          driverName: inv.driverName,
          driverMobile: inv.driverMobile,
          plantCode: inv.plantCode,
          dispatchedDate: inv.dispatchedDate,
          invoices: [],
          totalInvoices: 0,
          receivedInvoices: 0,
          completionRate: 0,
          podStatus: "PENDING",
        };
        map.set(inv.tripId, group);
      }
      group.invoices.push(inv);
    });

    const groups = Array.from(map.values());
    groups.forEach((g) => {
      g.totalInvoices = g.invoices.length;
      g.receivedInvoices = g.invoices.filter((i) => i.isReceived).length;
      g.completionRate = g.totalInvoices > 0 ? Math.round((g.receivedInvoices / g.totalInvoices) * 100) : 100;
      if (g.receivedInvoices === 0) {
        g.podStatus = "PENDING";
      } else if (g.receivedInvoices === g.totalInvoices) {
        g.podStatus = "COMPLETED";
      } else {
        g.podStatus = "PARTIAL_COMPLETED";
      }
    });

    return groups;
  }, [filteredInvoices]);

  const toggleTripExpand = (tripId: number) => {
    setExpandedTrips((prev) => {
      const next = new Set(prev);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  };

  const expandAllTrips = () => {
    setExpandedTrips(new Set(tripGroups.map((g) => g.tripId)));
  };

  const collapseAllTrips = () => {
    setExpandedTrips(new Set());
  };

  const handleMarkFullTripReceived = (tripId: number) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.tripId === tripId) {
          return {
            ...inv,
            isReceived: true,
            receivedAt: inv.receivedAt || new Date().toISOString(),
            receivedByName: inv.receivedByName || "Stores Hub",
          };
        }
        return inv;
      })
    );
    setSuccessMessage(`All invoices for Trip marked as received. Click 'Save POD Status' to commit.`);
  };

  // Selection handlers
  const toggleSelectOne = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllPending = () => {
    const pendingInFilter = filteredInvoices.filter((i) => !i.isReceived).map((i) => i.id);
    setSelectedIds(new Set(pendingInFilter));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Direct toggle on row checkbox
  const handleToggleReceived = (id: string | number) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const nextVal = !inv.isReceived;
          return {
            ...inv,
            isReceived: nextVal,
            receivedAt: nextVal ? new Date().toISOString() : null,
          };
        }
        return inv;
      })
    );
  };

  // Batch mark selected as Received
  const handleMarkSelectedAs = (received: boolean) => {
    if (selectedIds.size === 0) return;

    setInvoices((prev) =>
      prev.map((inv) => {
        if (selectedIds.has(inv.id)) {
          return {
            ...inv,
            isReceived: received,
            receivedAt: received ? new Date().toISOString() : null,
            remarks: remarksMap[inv.id] !== undefined ? remarksMap[inv.id] : inv.remarks,
          };
        }
        return inv;
      })
    );
  };

  // Save changes to backend
  const handleSaveChanges = async () => {
    setSaving(true);
    setSuccessMessage(null);

    try {
      // Collect items to update: either selected IDs or all modified rows
      const itemsToUpdate = invoices.map((inv) => ({
        tripId: inv.tripId,
        requestId: inv.requestId,
        invoiceNumber: inv.invoiceNumber,
        vehicleNumber: inv.vehicleNumber,
        driverName: inv.driverName,
        driverMobile: inv.driverMobile,
        locationName: inv.locationName,
        isReceived: inv.isReceived,
        remarks: remarksMap[inv.id] !== undefined ? remarksMap[inv.id] : inv.remarks,
      }));

      const res = await fetch("/api/pod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: itemsToUpdate }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Successfully saved POD acknowledgments.`);
        setSelectedIds(new Set());
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(data.message || "Failed to save POD updates.");
      }
    } catch (e: any) {
      alert(e.message || "Failed to save POD data.");
    } finally {
      setSaving(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const rows = filteredInvoices.map((inv, index) => ({
      "No.": index + 1,
      "Invoice Number": inv.invoiceNumber,
      "Trip Number": inv.tripNo,
      "Request Code": inv.requestCode,
      "Vehicle Plate": inv.vehicleNumber,
      "Vehicle Type": inv.vehicleType,
      "Driver Name": inv.driverName,
      "Driver Mobile": inv.driverMobile,
      "Delivery Destination": inv.locationName,
      "Plant": inv.plantCode,
      "Dispatched Date": inv.dispatchedDate,
      "POD Status": inv.isReceived ? "RECEIVED" : "PENDING",
      "Received Date": inv.receivedAt ? new Date(inv.receivedAt).toLocaleDateString() : "-",
      "Received Time": inv.receivedAt ? new Date(inv.receivedAt).toLocaleTimeString() : "-",
      "Receiver Remarks": inv.remarks || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "POD_Register");
    XLSX.writeFile(wb, `STR_POD_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-3 w-full max-w-[1600px] mx-auto pb-16 px-2 sm:px-4">
      {/* Top Header - Compact */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            POD Management
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* View Perspective Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("TRIP_WISE")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "TRIP_WISE"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Trip-wise View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("INVOICE_WISE")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "INVOICE_WISE"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoice-wise View</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="h-7.5 inline-flex items-center gap-1 px-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveChanges}
            className="h-7.5 inline-flex items-center gap-1 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            <span>{saving ? "Saving..." : "Save POD Status"}</span>
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* 4 Executive KPI Cards (~90px height) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Invoices */}
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col justify-between h-[90px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Total Invoices</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl font-black text-gray-900 tabular-nums tracking-tight">{stats.totalInvoices}</span>
            <span className="text-[11px] font-medium text-gray-400">Dispatched trips</span>
          </div>
        </div>

        {/* Card 2: PODs Received */}
        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs flex flex-col justify-between h-[90px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">PODs Received</span>
            <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl font-black text-emerald-600 tabular-nums tracking-tight">{stats.receivedCount}</span>
            <span className="text-[11px] font-medium text-emerald-700/70">Signed copies</span>
          </div>
        </div>

        {/* Card 3: Pending Return */}
        <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs flex flex-col justify-between h-[90px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Return</span>
            <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl font-black text-amber-600 tabular-nums tracking-tight">{stats.pendingCount}</span>
            <span className="text-[11px] font-medium text-amber-700/70">Awaiting return</span>
          </div>
        </div>

        {/* Card 4: Return Rate */}
        <div className="bg-white p-3 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs flex flex-col justify-between h-[90px]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Collection Rate</span>
            <span className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="text-2xl font-black text-purple-600 tabular-nums tracking-tight">{stats.returnRate}%</span>
            <span className="text-[11px] font-medium text-purple-700/70">Efficiency rate</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar - Single Line */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-2xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
        {/* Left: Status Filter Pills */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setStatusTab("ALL")}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusTab === "ALL"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({invoices.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("PENDING")}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusTab === "PENDING"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Pending ({stats.pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusTab("RECEIVED")}
            className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              statusTab === "RECEIVED"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Received ({stats.receivedCount})
          </button>
        </div>

        {/* Middle: Search Box */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Invoice No, Trip No, Plate, Driver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-8 pr-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Right: Dropdowns & Action */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
          <select
            value={selectedPlant}
            onChange={(e) => setSelectedPlant(e.target.value)}
            className="h-7 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Plants</option>
            {plants.map((p) => (
              <option key={p} value={p}>
                {p} Facility
              </option>
            ))}
          </select>

          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="h-7 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="THIS_MONTH">This Month</option>
          </select>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          <button
            type="button"
            onClick={handleSelectAllPending}
            className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            title="Select all pending invoices in view"
          >
            Select All Pending ({filteredInvoices.filter((i) => !i.isReceived).length})
          </button>

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700 font-semibold hover:bg-gray-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Clear ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* PERSPECTIVE 1: Trip-wise Master-Detail View (Default) */}
      {viewMode === "TRIP_WISE" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-gray-700">
              Showing {tripGroups.length} Delivery Trips ({filteredInvoices.length} Invoices)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAllTrips}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                Expand All
              </button>
              <span className="text-gray-300">&bull;</span>
              <button
                type="button"
                onClick={collapseAllTrips}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Collapse All
              </button>
            </div>
          </div>

          {tripGroups.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
              <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No delivery trips match the selected filter criteria.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tripGroups.map((group) => {
                const isExpanded = expandedTrips.has(group.tripId);
                const isAllReceived = group.podStatus === "COMPLETED";

                return (
                  <div
                    key={group.tripId}
                    className={`bg-white rounded-2xl border transition-all shadow-xs overflow-hidden ${
                      isAllReceived
                        ? "border-emerald-200 bg-emerald-50/10"
                        : group.podStatus === "PARTIAL_COMPLETED"
                        ? "border-amber-200"
                        : "border-gray-200"
                    }`}
                  >
                    {/* Master Trip Row */}
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Trip & Driver info */}
                      <div className="flex items-start sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleTripExpand(group.tripId)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
                          title={isExpanded ? "Collapse" : "Expand child invoices"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/trips/${group.tripId}`}
                              className="font-bold text-sm text-indigo-700 hover:underline tracking-tight"
                            >
                              Trip #{group.tripNo}
                            </Link>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                              {group.plantCode}
                            </span>

                            {group.tripStatus && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                                {group.tripStatus}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-gray-800">
                              <Truck className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{group.vehicleNumber}</span>
                              <span className="text-gray-400 text-[11px] font-normal">
                                ({group.vehicleType})
                              </span>
                            </span>

                            <span className="text-gray-300">&bull;</span>

                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <span>{group.driverName}</span>
                              {group.driverMobile !== "-" && (
                                <span className="text-gray-400 text-[11px]">({group.driverMobile})</span>
                              )}
                            </span>

                            <span className="text-gray-300">&bull;</span>

                            <span className="flex items-center gap-1 text-gray-500">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{group.dispatchedDate}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: POD Completion Progress & Quick Action */}
                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                        <div className="text-right space-y-1">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="text-xs font-bold text-gray-900">
                              {group.receivedInvoices} / {group.totalInvoices} PODs
                            </span>

                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                group.podStatus === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : group.podStatus === "PARTIAL_COMPLETED"
                                  ? "bg-amber-50 text-amber-700 border-amber-300"
                                  : "bg-gray-100 text-gray-600 border-gray-200"
                              }`}
                            >
                              {group.podStatus === "COMPLETED"
                                ? "Completed (100%)"
                                : group.podStatus === "PARTIAL_COMPLETED"
                                ? `Partial (${group.completionRate}%)`
                                : "Pending (0%)"}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="w-36 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200 ml-auto">
                            <div
                              className={`h-full transition-all duration-300 ${
                                group.completionRate === 100
                                  ? "bg-emerald-500"
                                  : group.completionRate > 0
                                  ? "bg-amber-500"
                                  : "bg-gray-300"
                              }`}
                              style={{ width: `${group.completionRate}%` }}
                            />
                          </div>
                        </div>

                        {/* Bulk Action: Complete Full Trip */}
                        {!isAllReceived ? (
                          <button
                            type="button"
                            onClick={() => handleMarkFullTripReceived(group.tripId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                            title="Mark all child invoices for this trip as received"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Mark Full Trip</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>100% Received</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Detail: Invoices Accordion Table */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/50 p-3 sm:p-4">
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                              <tr>
                                <th className="py-2.5 px-3 w-10 text-center">Status</th>
                                <th className="py-2.5 px-3">Invoice Number</th>
                                <th className="py-2.5 px-3">Request Code</th>
                                <th className="py-2.5 px-3">Destination</th>
                                <th className="py-2.5 px-3">Received At</th>
                                <th className="py-2.5 px-3">Receiver Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {group.invoices.map((inv) => (
                                <tr
                                  key={inv.id}
                                  className={`hover:bg-gray-50/80 transition-colors ${
                                    inv.isReceived ? "bg-emerald-50/15" : ""
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <td className="py-2.5 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={inv.isReceived}
                                      onChange={() => handleToggleReceived(inv.id)}
                                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 cursor-pointer"
                                    />
                                  </td>

                                  {/* Invoice Number */}
                                  <td className="py-2.5 px-3">
                                    <span className="font-bold text-xs text-slate-900 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                                      {inv.invoiceNumber}
                                    </span>
                                  </td>

                                  {/* Request Code */}
                                  <td className="py-2.5 px-3">
                                    <Link
                                      href={`/requests/${inv.requestId}`}
                                      className="font-semibold text-indigo-600 hover:underline"
                                    >
                                      {inv.requestCode}
                                    </Link>
                                  </td>

                                  {/* Destination */}
                                  <td className="py-2.5 px-3 text-gray-700">
                                    {inv.locationName}
                                  </td>

                                  {/* Received At */}
                                  <td className="py-2.5 px-3 text-gray-500 tabular-nums">
                                    {inv.isReceived && inv.receivedAt ? (
                                      <span className="text-emerald-700 font-medium">
                                        {new Date(inv.receivedAt).toLocaleDateString()}{" "}
                                        {new Date(inv.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">Pending return</span>
                                    )}
                                  </td>

                                  {/* Remarks */}
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="text"
                                      placeholder="Add remarks..."
                                      value={remarksMap[inv.id] !== undefined ? remarksMap[inv.id] : inv.remarks}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setRemarksMap((prev) => ({ ...prev, [inv.id]: val }));
                                      }}
                                      className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PERSPECTIVE 2: Invoice-wise Flat Registry View */}
      {viewMode === "INVOICE_WISE" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="py-3 px-4">Invoice Serial</th>
                <th className="py-3 px-4">Trip &amp; Request</th>
                <th className="py-3 px-4">Vehicle &amp; Spec</th>
                <th className="py-3 px-4">Assigned Driver</th>
                <th className="py-3 px-4">Destination Location</th>
                <th className="py-3 px-4">Dispatched</th>
                <th className="py-3 px-4 text-center">POD Received?</th>
                <th className="py-3 px-4">Received Date</th>
                <th className="py-3 px-4">Receiver Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-medium">No commercial invoices match the selected filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isSelected = selectedIds.has(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`hover:bg-gray-50/80 transition-colors ${
                        inv.isReceived ? "bg-emerald-50/15" : ""
                      } ${isSelected ? "bg-indigo-50/30" : ""}`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(inv.id)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                        />
                      </td>

                      {/* Invoice Number */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 tracking-tight bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg">
                            {inv.invoiceNumber}
                          </span>
                        </div>
                      </td>

                      {/* Trip No & Request */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/trips/${inv.tripId}`}
                          className="font-bold text-xs text-indigo-600 hover:text-indigo-800 tracking-tight flex items-center gap-1"
                        >
                          <span>{inv.tripNo}</span>
                        </Link>
                        <span className="text-[10px] text-gray-500 block mt-0.5 tracking-tight">
                          Req: {inv.requestCode}
                        </span>
                      </td>

                      {/* Vehicle */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 tracking-tight">
                          <Truck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{inv.vehicleNumber}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 block">{inv.vehicleType}</span>
                      </td>

                      {/* Driver & Mobile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{inv.driverName}</span>
                        </div>
                        {inv.driverMobile && inv.driverMobile !== "-" && (
                          <a
                            href={`tel:${inv.driverMobile}`}
                            className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 mt-0.5 tabular-nums"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{inv.driverMobile}</span>
                          </a>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex items-center gap-1 font-semibold text-gray-800">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{inv.locationName}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 block">{inv.plantCode} Origin</span>
                      </td>

                      {/* Dispatched Date */}
                      <td className="py-3 px-4 tabular-nums text-gray-700 font-medium">
                        {inv.dispatchedDate}
                      </td>

                      {/* POD Checkbox & Badge */}
                      <td className="py-3 px-4 text-center">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={inv.isReceived}
                            onChange={() => handleToggleReceived(inv.id)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                          />
                          {inv.isReceived ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>RECEIVED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>PENDING</span>
                            </span>
                          )}
                        </label>
                      </td>

                      {/* Received Date */}
                      <td className="py-3 px-4 tabular-nums text-gray-600 text-xs">
                        {inv.receivedAt ? (
                          <div>
                            <span className="font-semibold text-gray-900 block">
                              {new Date(inv.receivedAt).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(inv.receivedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Add remarks..."
                          value={remarksMap[inv.id] !== undefined ? remarksMap[inv.id] : inv.remarks}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRemarksMap((prev) => ({ ...prev, [inv.id]: val }));
                          }}
                          className="w-full text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                        />
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

      {/* Floating Batch Action Bar (When rows are selected) */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 duration-200 border border-slate-700">
          <div className="text-xs">
            <span className="font-bold text-amber-400 tabular-nums">{selectedIds.size}</span> invoice(s) selected
          </div>

          <div className="h-4 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() => handleMarkSelectedAs(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark as Received</span>
          </button>

          <button
            type="button"
            onClick={() => handleMarkSelectedAs(false)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Mark as Pending</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveChanges}
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? "Saving..." : "Save Now"}</span>
          </button>

          <button
            type="button"
            onClick={handleClearSelection}
            className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};
