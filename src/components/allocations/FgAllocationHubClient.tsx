"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  Combine,
  Search,
  RotateCcw,
  FileSpreadsheet,
  PlusCircle,
  Eye,
  XCircle,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Filter,
  Lock,
  RefreshCw,
  Plus,
  Save,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface FgAllocationHubClientProps {
  initialRequests: any[];
  plants: any[];
  operations: any[];
  vehicles: any[];
  drivers: any[];
  routes: any[];
}

export function FgAllocationHubClient({
  initialRequests,
  plants,
  operations,
  vehicles,
  drivers,
  routes,
}: FgAllocationHubClientProps) {
  const router = useRouter();

  // Filters State (default to All Statuses and All Dates to display imported records)
  const [search, setSearch] = useState("");
  const [selectedPlant, setSelectedPlant] = useState("");
  const [selectedOperation, setSelectedOperation] = useState("");
  const [selectedSubOp, setSelectedSubOp] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("SUBMITTED");
  const [selectedDateRange, setSelectedDateRange] = useState("");

  // Combine Mode & Selection
  const [combineMode, setCombineMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Modals
  const [singleAllocModalOpen, setSingleAllocModalOpen] = useState(false);
  const [currentAllocReq, setCurrentAllocReq] = useState<any | null>(null);
  const [currentAllocRequests, setCurrentAllocRequests] = useState<any[]>([]);
  const [modalVehicleId, setModalVehicleId] = useState("");
  const [modalDriverId, setModalDriverId] = useState("");
  const [modalRouteId, setModalRouteId] = useState("");
  const [modalDistance, setModalDistance] = useState<number | string>("");
  const [modalRemarks, setModalRemarks] = useState("");
  const [suggestedRoutes, setSuggestedRoutes] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submittingAlloc, setSubmittingAlloc] = useState(false);

  // New Combine Modal
  const [newCombineModalOpen, setNewCombineModalOpen] = useState(false);
  const [combineVehicleId, setCombineVehicleId] = useState("");
  const [combineDriverId, setCombineDriverId] = useState("");
  const [combineRemarks, setCombineRemarks] = useState("");
  const [submittingCombine, setSubmittingCombine] = useState(false);

  // Extract unique sub-operations from requests
  const subOperationOptions = useMemo(() => {
    const set = new Set<string>();
    initialRequests.forEach((r) => {
      if (r.subOperation?.name) set.add(r.subOperation.name);
    });
    return Array.from(set).sort();
  }, [initialRequests]);

  // Date Filtering Logic
  const filterByDate = (dateStr: string | Date, range: string): boolean => {
    if (!range) return true;
    const reqDate = new Date(dateStr);
    const now = new Date();

    const todayStr = now.toISOString().slice(0, 10);
    const reqDateStr = reqDate.toISOString().slice(0, 10);

    if (range === "today") {
      return reqDateStr === todayStr;
    }

    const dayOfWeek = now.getDay() || 7; // Mon = 1, Sun = 7
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
    thisWeekStart.setHours(0, 0, 0, 0);

    if (range === "this_week") {
      return reqDate >= thisWeekStart && reqDate <= now;
    }

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    if (range === "last_week") {
      return reqDate >= lastWeekStart && reqDate <= lastWeekEnd;
    }

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === "this_month") {
      return reqDate >= thisMonthStart && reqDate <= now;
    }

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    if (range === "last_month") {
      return reqDate >= lastMonthStart && reqDate <= lastMonthEnd;
    }

    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    if (range === "this_year") {
      return reqDate >= thisYearStart && reqDate <= now;
    }

    return true;
  };

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return initialRequests.filter((r) => {
      // 1. Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const code = (r.requestCode || "").toLowerCase();
        const plant = (r.plant?.name || r.plant?.code || "").toLowerCase();
        const item = (r.itemDescription || "").toLowerCase();
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
          !plant.includes(q) &&
          !item.includes(q) &&
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

      // 4. Sub-Operation
      if (selectedSubOp && r.subOperation?.name !== selectedSubOp) {
        return false;
      }

      // 5. Status (Case-Insensitive matching)
      if (selectedStatus) {
        const reqStatus = (r.status || "").toUpperCase();
        if (selectedStatus === "SUBMITTED") {
          if (reqStatus !== "SUBMITTED" && reqStatus !== "UNDER REVIEW") return false;
        } else if (reqStatus !== selectedStatus.toUpperCase()) {
          return false;
        }
      }

      // 6. Date Range (based on requiredDate or createdAt)
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
    selectedSubOp,
    selectedStatus,
    selectedDateRange,
  ]);

  const hasActiveFilters =
    search !== "" ||
    selectedPlant !== "" ||
    selectedOperation !== "" ||
    selectedSubOp !== "" ||
    selectedStatus !== "SUBMITTED" ||
    selectedDateRange !== "";

  const resetFilters = () => {
    setSearch("");
    setSelectedPlant("");
    setSelectedOperation("");
    setSelectedSubOp("");
    setSelectedStatus("SUBMITTED");
    setSelectedDateRange("");
  };

  // Checkbox handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const eligible = filteredRequests
        .filter((r) => !["ALLOCATED", "COMPLETED", "CANCELLED", "REJECTED"].includes(r.status))
        .map((r) => r.id);
      setSelectedIds(eligible);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Excel Export
  const handleExportExcel = () => {
    const targetData =
      selectedIds.length > 0
        ? filteredRequests.filter((r) => selectedIds.includes(r.id))
        : filteredRequests;

    const rows = targetData.map((r) => ({
      "Request Code": r.requestCode,
      "Operation Type": r.operation?.name || "",
      "Sub Operation": r.subOperation?.name || "",
      "Requested Plant": r.plant?.code || "",
      "Item Description": r.itemDescription,
      "Planned / Special": r.requestType || "PLANNED",
      "Box": r.boxCount || 0,
      "Quantity (KG)": Number(r.requiredKg) || 0,
      "CBM": Number(r.requiredCbm) || 0,
      "Vehicle Type": r.vehicleType?.name || "-",
      "From Location": r.fromLocation?.locationName || "",
      "To Location": r.toLocation?.locationName || "",
      "Customer Code": r.toLocation?.code || "-",
      "Required Date": r.requiredDate ? new Date(r.requiredDate).toISOString().slice(0, 10) : "",
      "Required Time": r.requiredTime || "-",
      "Goods Ready Status": r.goodsReadyStatus || "-",
      "Urgency Type": r.urgency || "Normal",
      "Additional Remarks": r.remarks || "-",
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
    XLSX.utils.book_append_sheet(wb, ws, "Allocations");
    XLSX.writeFile(wb, `STR_Allocations_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Fetch matching corridor routes matching PHP suggestRoutes logic
  const fetchModalRoutes = async (fromId?: number, toIds?: number | number[] | string) => {
    if (!fromId || !toIds) {
      setSuggestedRoutes([]);
      setModalRouteId("");
      setModalDistance("");
      return;
    }
    setLoadingSuggestions(true);
    try {
      const toIdsParam = Array.isArray(toIds) ? toIds.join(",") : String(toIds);
      const res = await fetch(`/api/routes/suggest?from_id=${fromId}&to_ids=${toIdsParam}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSuggestedRoutes(data);
        setModalRouteId(String(data[0].id));
        setModalDistance(Number(data[0].total_distance || data[0].total_distance_km || 0));
      } else {
        setSuggestedRoutes([]);
        setModalRouteId("");
        setModalDistance("");
      }
    } catch {
      setSuggestedRoutes([]);
      setModalRouteId("");
      setModalDistance("");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Open Single Allocation Modal
  const openSingleAllocModal = async (req: any) => {
    setCurrentAllocReq(req);
    setCurrentAllocRequests([req]);
    setModalVehicleId("");
    setModalDriverId("");
    setModalRouteId("");
    setModalDistance("");
    setModalRemarks("");
    setSingleAllocModalOpen(true);

    if (req.fromLocationId && req.toLocationId) {
      await fetchModalRoutes(req.fromLocationId, req.toLocationId);
    } else {
      setSuggestedRoutes([]);
      setModalRouteId("");
      setModalDistance("");
    }
  };

  // Open Multiple Allocation Modal (Proceed Combine)
  const openMultipleAllocModal = async () => {
    if (selectedIds.length === 0) return;
    const selectedReqs = initialRequests.filter((r) => selectedIds.includes(r.id));
    if (selectedReqs.length === 0) return;

    setCurrentAllocReq(selectedReqs[0]);
    setCurrentAllocRequests(selectedReqs);
    setModalVehicleId("");
    setModalDriverId("");
    setModalRouteId("");
    setModalDistance("");
    setModalRemarks("");
    setSingleAllocModalOpen(true);

    const fromId = selectedReqs[0]?.fromLocationId;
    const toIds = Array.from(new Set(selectedReqs.map((r) => r.toLocationId).filter(Boolean)));
    await fetchModalRoutes(fromId, toIds as number[]);
  };

  // Open New Combine Modal
  const openNewCombineModal = () => {
    setCombineVehicleId("");
    setCombineDriverId("");
    setCombineRemarks("");
    setNewCombineModalOpen(true);
  };

  // Handle vehicle change for Single Allocation modal with auto-driver selection
  const handleSingleVehicleChange = (vId: string) => {
    setModalVehicleId(vId);
    if (vId) {
      const linked = drivers.find((d: any) => Number(d.linkedVehicleId) === Number(vId));
      if (linked) {
        setModalDriverId(String(linked.id));
      }
    }
  };

  // Handle vehicle change for New Combine modal with auto-driver selection
  const handleCombineVehicleChange = (vId: string) => {
    setCombineVehicleId(vId);
    if (vId) {
      const linked = drivers.find((d: any) => Number(d.linkedVehicleId) === Number(vId));
      if (linked) {
        setCombineDriverId(String(linked.id));
      }
    }
  };

  const isSingleDriverAutoSelected = useMemo(() => {
    if (!modalVehicleId || !modalDriverId) return false;
    const linked = drivers.find((d: any) => Number(d.linkedVehicleId) === Number(modalVehicleId));
    return linked ? String(linked.id) === String(modalDriverId) : false;
  }, [modalVehicleId, modalDriverId, drivers]);

  const isCombineDriverAutoSelected = useMemo(() => {
    if (!combineVehicleId || !combineDriverId) return false;
    const linked = drivers.find((d: any) => Number(d.linkedVehicleId) === Number(combineVehicleId));
    return linked ? String(linked.id) === String(combineDriverId) : false;
  }, [combineVehicleId, combineDriverId, drivers]);

  // Auto re-fetch corridor route on window focus, message, or storage when returning from New Route tab
  useEffect(() => {
    if (!singleAllocModalOpen || currentAllocRequests.length === 0) return;

    const fromId = currentAllocRequests[0]?.fromLocationId;
    const toIds = Array.from(new Set(currentAllocRequests.map((r) => r.toLocationId).filter(Boolean)));

    const handleFocus = () => {
      fetchModalRoutes(fromId, toIds as number[]);
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "ROUTE_CREATED") {
        fetchModalRoutes(fromId, toIds as number[]);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "STR_ROUTE_CREATED_TS") {
        fetchModalRoutes(fromId, toIds as number[]);
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [singleAllocModalOpen, currentAllocRequests]);

  // On modal route select change
  const handleRouteChange = (routeId: string) => {
    setModalRouteId(routeId);
    const found =
      suggestedRoutes.find((r) => String(r.id) === routeId) ||
      routes.find((r) => String(r.id) === routeId);
    if (found) {
      const dist = found.total_distance || found.total_distance_km || found.totalDistanceKm || 0;
      setModalDistance(dist);
    }
  };

  // Submit Allocation (Single or Multiple Combined)
  const handleSubmitSingleAlloc = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqIds = currentAllocRequests.length > 0
      ? currentAllocRequests.map((r) => r.id)
      : currentAllocReq ? [currentAllocReq.id] : [];

    if (reqIds.length === 0 || !modalVehicleId || !modalDriverId || !modalRouteId) {
      alert("Please select Vehicle, Driver, and a valid Corridor Route. If no route exists for this corridor, click 'Create New Route' to map the route first.");
      return;
    }

    setSubmittingAlloc(true);
    try {
      const res = await fetch("/api/allocations/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: reqIds,
          vehicleId: modalVehicleId,
          driverId: modalDriverId,
          routeId: modalRouteId,
          plannedKm: Number(modalDistance) || 0,
          adminRemarks: modalRemarks,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSingleAllocModalOpen(false);
        setSelectedIds([]);
        router.refresh();
      } else {
        alert(json.message || "Allocation failed.");
      }
    } catch (err: any) {
      alert(err.message || "Network error occurred.");
    } finally {
      setSubmittingAlloc(false);
    }
  };

  // Submit New Combine Trip (with optional selected requests)
  const handleSubmitNewCombine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!combineVehicleId || !combineDriverId) {
      alert("Please select Vehicle and Driver.");
      return;
    }

    setSubmittingCombine(true);
    try {
      const res = await fetch("/api/allocations/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-empty",
          vehicleId: combineVehicleId,
          driverId: combineDriverId,
          adminRemarks: combineRemarks,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.trip?.id) {
        const tripId = json.trip.id;

        // If requests were selected via Combine Mode, attach them to this trip
        if (selectedIds.length > 0) {
          for (const reqId of selectedIds) {
            await fetch("/api/allocations/combine", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "add-request",
                tripId,
                requestId: reqId,
              }),
            });
          }
        }

        setNewCombineModalOpen(false);
        router.push(`/allocations/fg/combine/${tripId}`);
      } else {
        alert(json.message || "Failed to create combine trip.");
      }
    } catch (err: any) {
      alert(err.message || "Network error occurred.");
    } finally {
      setSubmittingCombine(false);
    }
  };

  return (
    <div className="flex flex-col space-y-2.5 w-full">
      {/* Filters Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Search Box */}
          <div className="relative w-full sm:w-36">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Code, Plant..."
              className="w-full h-8 pl-6 pr-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
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

            {/* Sub Operation Dropdown */}
            <select
              value={selectedSubOp}
              onChange={(e) => setSelectedSubOp(e.target.value)}
              className="h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Sub Operations</option>
              {subOperationOptions.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
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
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
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

          {/* Reset Filters Button */}
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
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 inline-flex items-center gap-1 px-2 sm:px-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Export filtered or selected rows to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden xs:inline">Export Excel</span>
            <span className="xs:hidden">Excel</span>
          </button>

          <button
            type="button"
            onClick={openNewCombineModal}
            className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Create New Combine Trip"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">New Combine</span>
            <span className="xs:hidden">New</span>
          </button>

          <button
            type="button"
            onClick={() => setCombineMode(!combineMode)}
            className={`h-8 inline-flex items-center gap-1 px-2 sm:px-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              combineMode
                ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-bold"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            title={combineMode ? "Exit Combine Mode" : "Enter Combine Mode"}
          >
            <Combine className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="hidden xs:inline">Combine Mode</span>
            <span className="xs:hidden">Combine</span>
          </button>

          {combineMode && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={openMultipleAllocModal}
              className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer animate-pulse"
            >
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">Proceed Combine</span>
              <span className="xs:hidden">Proceed</span> ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Sticky Table Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-max">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-200 border-b border-slate-300">
              <tr className="text-[10.5px] uppercase tracking-wider text-slate-800 font-bold">
                {combineMode && (
                  <th className="px-2.5 py-1.5 border-r border-slate-300 text-center w-10 bg-slate-200">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length > 0 &&
                        selectedIds.length ===
                          filteredRequests.filter(
                            (r) => !["ALLOCATED", "COMPLETED", "CANCELLED", "REJECTED"].includes(r.status)
                          ).length
                      }
                      onChange={handleSelectAll}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[125px]">REQUEST CODE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">OPERATION TYPE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">SUB OPERATION</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">REQUESTED PLANT</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[180px] max-w-[240px]">ITEM DESCRIPTION</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">PLANNED / SPECIAL</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">BOX</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">QUANTITY (GW)</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-right">CBM</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[140px]">VEHICLE SIZE/TYPE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[170px] max-w-[220px]">FROM LOCATION</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 min-w-[170px] max-w-[220px]">TO LOCATION</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">CUSTOMER CODE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">REQUIRED DATE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">REQUIRED TIME</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">GOODS READY</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">URGENCY TYPE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 max-w-[200px]">REMARKS</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">REQUESTED BY</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">SUBMITTED AT</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">TRIP ID</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">VEHICLE PLATE</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-left">ASSIGNED DRIVER</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300 text-center">ROUTE ID</th>
                <th className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-300">STATUS</th>
                <th className="px-2.5 py-1.5 pr-3 text-right whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={27} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No requests found matching current filters.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Try clearing filters or changing the status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isAllocated = req.status === "ALLOCATED" || req.status === "COMPLETED";
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
                      {combineMode && (
                        <td className="px-2.5 py-1.5 border-r border-slate-100 text-center w-10">
                          {!["ALLOCATED", "COMPLETED", "CANCELLED", "REJECTED"].includes(req.status) ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(req.id)}
                              onChange={() => handleSelectOne(req.id)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                          ) : (
                            <input
                              type="checkbox"
                              disabled
                              className="w-3.5 h-3.5 text-slate-300 rounded border-slate-200 cursor-not-allowed"
                            />
                          )}
                        </td>
                      )}

                      {/* 1. Request Code */}
                      <td className="px-2.5 py-1.5 font-bold text-blue-600 border-r border-slate-100 whitespace-nowrap min-w-[125px] tracking-tight">
                        <Link href={`/requests/${req.id}`} className="hover:underline">
                          {req.requestCode}
                        </Link>
                      </td>

                      {/* 2. Operation Type */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {req.operation?.name || "-"}
                      </td>

                      {/* 3. Sub Operation */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 border-r border-slate-100 whitespace-nowrap">
                        {req.subOperation?.name ? (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold uppercase text-[9.5px]">
                            {req.subOperation.name}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>

                      {/* 4. Requested Plant */}
                      <td className="px-2.5 py-1.5 font-bold text-slate-800 whitespace-nowrap border-r border-slate-100">
                        <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10.5px]">
                          {req.plant?.name || req.plant?.code}
                        </span>
                      </td>

                      {/* 5. Item Description */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-800 whitespace-nowrap border-r border-slate-100 min-w-[180px] max-w-[240px] truncate" title={req.itemDescription}>
                        {req.itemDescription}
                      </td>

                      {/* 6. Planned / Special */}
                      <td className="px-2.5 py-1.5 font-medium text-center whitespace-nowrap border-r border-slate-100">
                        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase">
                          {req.requestType || "PLANNED"}
                        </span>
                      </td>

                      {/* 7. Box */}
                      <td className="px-2.5 py-1.5 font-bold text-center text-slate-800 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {req.boxCount || 0}
                      </td>

                      {/* 8. Quantity (GW) */}
                      <td className="px-2.5 py-1.5 font-bold text-right text-slate-800 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {Number(req.requiredKg || 0).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg
                      </td>

                      {/* 9. CBM */}
                      <td className="px-2.5 py-1.5 font-bold text-right text-slate-800 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {Number(req.requiredCbm || 0).toFixed(2)}
                      </td>

                      {/* 10. Vehicle Size/Type */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100 min-w-[140px] truncate" title={req.vehicleType?.name || ""}>
                        {req.vehicleType?.name || "-"}
                      </td>

                      {/* 11. From Location */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100 min-w-[170px] max-w-[220px] truncate" title={req.fromLocation?.locationName || ""}>
                        {req.fromLocation?.locationName || "-"}
                      </td>

                      {/* 12. To Location */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100 min-w-[170px] max-w-[220px] truncate" title={req.toLocation?.locationName || ""}>
                        {req.toLocation?.locationName || "-"}
                      </td>

                      {/* 13. Customer Code */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {req.toLocation?.code || "-"}
                      </td>

                      {/* 14. Required Date */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {req.requiredDate ? new Date(req.requiredDate).toISOString().slice(0, 10) : "-"}
                      </td>

                      {/* 15. Required Time */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100 tabular-nums">
                        {req.requiredTime || "-"}
                      </td>

                      {/* 16. Goods Ready Status */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100">
                        {req.goodsReadyStatus || "-"}
                      </td>

                      {/* 17. Urgency Type */}
                      <td className="px-2.5 py-1.5 font-medium whitespace-nowrap border-r border-slate-100">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                            req.urgency === "Urgent" || req.urgency === "High"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {req.urgency || "Normal"}
                        </span>
                      </td>

                      {/* 18. Additional Remarks */}
                      <td className="px-2.5 py-1.5 text-slate-500 whitespace-nowrap border-r border-slate-100 max-w-[180px] truncate" title={req.remarks || ""}>
                        {req.remarks || "-"}
                      </td>

                      {/* 19. Requested By */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-700 whitespace-nowrap border-r border-slate-100">
                        {req.requester?.name || "-"}
                      </td>

                      {/* 20. Submitted At */}
                      <td className="px-2.5 py-1.5 font-medium text-slate-600 whitespace-nowrap border-r border-slate-100 text-[10.5px] tabular-nums">
                        {req.createdAt ? new Date(req.createdAt).toISOString().slice(0, 16).replace("T", " ") : "-"}
                      </td>

                      {/* 21. Trip ID */}
                      <td className="px-2.5 py-1.5 font-bold whitespace-nowrap border-r border-slate-100 text-center">
                        {tripId && tripNo ? (
                          <Link
                            href={`/allocations/fg/combine/${tripId}`}
                            className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-0.5 rounded text-[10.5px] font-bold transition-colors tracking-tight"
                            title="Open in Combine Workbench"
                          >
                            <span>{tripNo}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 22. Vehicle Plate */}
                      <td className="px-2.5 py-1.5 font-bold whitespace-nowrap border-r border-slate-100 text-center">
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

                      {/* 23. Assigned Driver */}
                      <td className="px-2.5 py-1.5 font-medium whitespace-nowrap border-r border-slate-100 text-left">
                        {driverName ? (
                          <span
                            className="text-slate-800 font-medium"
                            title={driverMobile ? `Driver Mobile: ${driverMobile}` : undefined}
                          >
                            {driverName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 24. Route ID */}
                      <td className="px-2.5 py-1.5 font-medium whitespace-nowrap border-r border-slate-100 text-center">
                        {routeCode ? (
                          <span
                            className="inline-flex items-center font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] tracking-tight max-w-[140px] truncate"
                            title={routeName || "Corridor Route"}
                          >
                            {routeCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* 22. Status */}
                      <td className="px-2.5 py-1.5 whitespace-nowrap border-r border-slate-100">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* 23. Actions */}
                      <td className="px-2.5 py-1.5 pr-3 text-right whitespace-nowrap font-medium">
                        <div className="flex items-center justify-end space-x-1.5">
                          <Link
                            href={`/requests/${req.id}`}
                            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {!["ALLOCATED", "COMPLETED", "CANCELLED", "REJECTED"].includes(req.status) && (
                            <button
                              type="button"
                              onClick={() => openSingleAllocModal(req)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Allocate Single Dedicated Vehicle"
                            >
                              <Truck className="w-4 h-4" />
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

      {/* Single Allocation Modal */}
      {singleAllocModalOpen && currentAllocReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl lg:max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-2xs">
                  <Truck className="w-5 h-5 font-bold" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Allocate Vehicle</h3>
                  <p className="text-xs text-slate-500">
                    Assign vehicle, driver, and trip route
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSingleAllocModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitSingleAlloc} className="p-6 sm:p-7 space-y-5 overflow-y-auto flex-1">
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl px-5 py-3.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Allocating for Request:</span>
                <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3.5 py-1.5 rounded-lg text-xs tracking-tight">
                  {currentAllocRequests.length > 1
                    ? `${currentAllocRequests.length} Requests Selected`
                    : currentAllocReq.requestCode}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={modalVehicleId}
                    onChange={(e) => handleSingleVehicleChange(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Driver <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={modalDriverId}
                    onChange={(e) => setModalDriverId(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
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
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Trip Route <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {loadingSuggestions && (
                      <span className="text-[11px] text-indigo-600 font-semibold animate-pulse">
                        Searching route...
                      </span>
                    )}
                    {(() => {
                      const fromId = currentAllocRequests[0]?.fromLocationId || currentAllocReq?.fromLocationId || "";
                      const toIds = Array.from(new Set(currentAllocRequests.map((r) => r.toLocationId).filter(Boolean))).join(",");
                      return (
                        <a
                          href={`/routes/create?origin_id=${fromId}&stop_ids=${toIds}&return_to=allocation`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Create new route"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>New Route</span>
                        </a>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <select
                    required
                    value={modalRouteId}
                    onChange={(e) => handleRouteChange(e.target.value)}
                    className={`flex-1 text-xs font-medium rounded-xl px-3.5 py-2.5 border transition-all shadow-2xs ${
                      suggestedRoutes.length === 0
                        ? "border-amber-300 bg-amber-50/40 text-amber-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        : "border-slate-300 bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                  >
                    {suggestedRoutes.length > 0 ? (
                      suggestedRoutes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.route_name || r.routeName} ({r.route_code || r.routeCode}) - {r.total_distance || r.totalDistanceKm || 0} km
                        </option>
                      ))
                    ) : (
                      <option value="">No matching route found</option>
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      const fromId = currentAllocRequests[0]?.fromLocationId || currentAllocReq?.fromLocationId;
                      const toIds = Array.from(new Set(currentAllocRequests.map((r) => r.toLocationId).filter(Boolean)));
                      fetchModalRoutes(fromId, toIds as number[]);
                    }}
                    title="Refresh Routes"
                    className="p-2.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors shrink-0 cursor-pointer flex items-center justify-center h-[42px] w-[42px]"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? "animate-spin text-blue-600" : ""}`} />
                  </button>
                </div>

                {/* Prominent New Route Warning Banner when no matching route exists */}
                {suggestedRoutes.length === 0 && !loadingSuggestions && (() => {
                  const fromId = currentAllocRequests[0]?.fromLocationId || currentAllocReq?.fromLocationId || "";
                  const toIds = Array.from(new Set(currentAllocRequests.map((r) => r.toLocationId).filter(Boolean))).join(",");
                  return (
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="text-xs text-amber-900 font-medium">
                          No matching route found for this corridor.
                        </span>
                      </div>
                      <a
                        href={`/routes/create?origin_id=${fromId}&stop_ids=${toIds}&return_to=allocation`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shrink-0 inline-flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        title="Create route in Route Master"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Route</span>
                      </a>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Distance (km)
                  </label>
                  <input
                    type="text"
                    readOnly={true}
                    value={modalDistance ? `${modalDistance}` : ""}
                    placeholder="Auto-filled"
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-500 cursor-not-allowed shadow-2xs placeholder-slate-400 font-semibold tabular-nums"
                    title="Auto-filled from selected route"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Admin Remarks
                  </label>
                  <input
                    type="text"
                    value={modalRemarks}
                    onChange={(e) => setModalRemarks(e.target.value)}
                    placeholder="Optional notes for trip..."
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setSingleAllocModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAlloc}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submittingAlloc ? "Allocating..." : "Confirm Allocation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Combine Trip Modal */}
      {newCombineModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 bg-indigo-50/60 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <Combine className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {selectedIds.length > 0
                      ? `Create Combine Trip (${selectedIds.length} Requests Selected)`
                      : "Create New Combine Trip"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Initialize vehicle & driver to start grouping requests
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewCombineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitNewCombine} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={combineVehicleId}
                    onChange={(e) => handleCombineVehicleChange(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs text-slate-800"
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
                    {isCombineDriverAutoSelected && (
                      <span className="text-[10.5px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Auto-assigned
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={combineDriverId}
                    onChange={(e) => setCombineDriverId(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs text-slate-800"
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
                  value={combineRemarks}
                  onChange={(e) => setCombineRemarks(e.target.value)}
                  placeholder="Optional notes for this combine trip..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs text-slate-800 placeholder-slate-400"
                />
              </div>

              {selectedIds.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                  <span>
                    <strong>{selectedIds.length}</strong> request(s) will be automatically attached to this combine trip upon creation.
                  </span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewCombineModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCombine}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  {submittingCombine ? "Creating Trip..." : "Create & Open Workbench"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
