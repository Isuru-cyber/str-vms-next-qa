"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Route as RouteIcon,
  Plus,
  Search,
  MapPin,
  Compass,
  Edit2,
  Trash2,
  Copy,
  ChevronRight,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  X,
  AlertTriangle,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Eye,
  Lock,
} from "lucide-react";
import * as XLSX from "xlsx";
import { formatNumber } from "@/lib/utils";

interface LocationItem {
  id: number;
  locationName: string;
  businessGroup: string | null;
  locationType: string;
  isOrigin: number;
}

interface RouteStopItem {
  id?: number;
  locationId: number;
  stopSequence: number;
  legDistanceKm?: number | string | null;
  cumulativeDistanceKm?: number | string | null;
  location?: {
    id: number;
    locationName: string;
    locationType: string;
  };
}

interface RouteItem {
  id: number;
  routeCode: string;
  routeName: string;
  businessGroup: string | null;
  operationType: string | null;
  originLocationId: number;
  totalDistanceKm: number | string | null;
  routeGroup: string | null;
  active: number;
  remarks: string | null;
  originLocation?: {
    id: number;
    locationName: string;
    locationType: string;
  };
  stops?: RouteStopItem[];
}

interface RouteRegistryProps {
  initialRoutes: RouteItem[];
  locations: LocationItem[];
}

interface StopFormItem {
  locationId: string;
  cumulativeDistanceKm: string;
  isDirect?: boolean;
  sourceRoute?: string;
}

export const RouteRegistry: React.FC<RouteRegistryProps> = ({
  initialRoutes,
  locations,
}) => {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteItem[]>(initialRoutes);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBg, setSelectedBg] = useState<"ELASTIC" | "YARN">("ELASTIC");

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "clone">("create");
  const [viewingRoute, setViewingRoute] = useState<RouteItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<RouteItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [formData, setFormData] = useState<{
    id?: number;
    routeCode: string;
    routeName: string;
    businessGroup: string;
    operationType: string;
    originLocationId: number | string;
    totalDistanceKm: string;
    remarks: string;
    active: number;
    stops: StopFormItem[];
  }>({
    routeCode: "",
    routeName: "",
    businessGroup: "ELASTIC",
    operationType: "",
    originLocationId: locations.find((l) => l.isOrigin === 1)?.id || locations[0]?.id || "",
    totalDistanceKm: "",
    remarks: "",
    active: 1,
    stops: [{ locationId: "", cumulativeDistanceKm: "" }],
  });

  // Group locations by type for optgroups matching PHP
  const typeOrder = ["PLANT", "WAREHOUSE", "CUSTOMER", "SUPPLIER", "INTERNAL", "OTHER"];
  const typeLabels: Record<string, string> = {
    PLANT: "PLANTS",
    WAREHOUSE: "WAREHOUSES",
    CUSTOMER: "CUSTOMERS",
    SUPPLIER: "SUPPLIERS",
    INTERNAL: "INTERNAL / OTHER",
    OTHER: "OTHER LOCATIONS",
  };

  const groupedLocations = locations.reduce<Record<string, LocationItem[]>>((acc, loc) => {
    const t = (loc.locationType || "OTHER").toUpperCase();
    if (!acc[t]) acc[t] = [];
    acc[t].push(loc);
    return acc;
  }, {});

  // Generate route name chain
  const computeRouteName = (originId: string | number, currentStops: StopFormItem[]) => {
    const originLoc = locations.find((l) => String(l.id) === String(originId));
    const parts: string[] = [];
    if (originLoc) parts.push(originLoc.locationName);

    currentStops.forEach((s) => {
      if (s.locationId) {
        const dest = locations.find((l) => String(l.id) === String(s.locationId));
        if (dest) parts.push(dest.locationName);
      }
    });

    return parts.length > 0 ? parts.join(" -> ") : "";
  };

  // Filter routes
  const filteredRoutes = routes.filter((r) => {
    const bg = r.businessGroup || "ELASTIC";
    const matchesBg = bg.toUpperCase() === selectedBg;
    const matchesSearch =
      r.routeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.originLocation?.locationName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.stops || []).some((s) =>
        (s.location?.locationName || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
    return matchesBg && matchesSearch;
  });

  // Stats
  const elasticCount = routes.filter((r) => (r.businessGroup || "ELASTIC").toUpperCase() === "ELASTIC").length;
  const yarnCount = routes.filter((r) => (r.businessGroup || "").toUpperCase() === "YARN").length;

  const openCreateModal = () => {
    setModalMode("create");
    setErrorMessage("");

    // Auto-generate next route code
    const codes = routes
      .map((r) => {
        const m = r.routeCode.match(/RTE-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = codes.length > 0 ? Math.max(...codes) : routes.length;
    const nextCode = `RTE-${String(maxNum + 1).padStart(4, "0")}`;

    const defaultOrigin = locations.find((l) => l.isOrigin === 1)?.id || locations[0]?.id || "";
    const initialStops: StopFormItem[] = [{ locationId: "", cumulativeDistanceKm: "" }];

    setFormData({
      routeCode: nextCode,
      routeName: computeRouteName(defaultOrigin, initialStops),
      businessGroup: selectedBg,
      operationType: "",
      originLocationId: defaultOrigin,
      totalDistanceKm: "",
      remarks: "",
      active: 1,
      stops: initialStops,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (r: RouteItem) => {
    setModalMode("edit");
    setErrorMessage("");
    const deliveryStops: StopFormItem[] = (r.stops || [])
      .filter((s) => s.stopSequence > 0)
      .map((s) => ({
        locationId: String(s.locationId),
        cumulativeDistanceKm: String(s.cumulativeDistanceKm || ""),
      }));

    setFormData({
      id: r.id,
      routeCode: r.routeCode,
      routeName: r.routeName,
      businessGroup: r.businessGroup || "ELASTIC",
      operationType: r.operationType || "",
      originLocationId: r.originLocationId,
      totalDistanceKm: String(r.totalDistanceKm || ""),
      remarks: r.remarks || "",
      active: r.active,
      stops:
        deliveryStops.length > 0
          ? deliveryStops
          : [{ locationId: "", cumulativeDistanceKm: "" }],
    });
    setIsModalOpen(true);
  };

  const openCloneModal = (r: RouteItem) => {
    setModalMode("clone");
    setErrorMessage("");

    const codes = routes
      .map((rt) => {
        const m = rt.routeCode.match(/RTE-(\d+)/i);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = codes.length > 0 ? Math.max(...codes) : routes.length;
    const nextCode = `RTE-${String(maxNum + 1).padStart(4, "0")}`;

    const deliveryStops: StopFormItem[] = (r.stops || [])
      .filter((s) => s.stopSequence > 0)
      .map((s) => ({
        locationId: String(s.locationId),
        cumulativeDistanceKm: String(s.cumulativeDistanceKm || ""),
      }));

    setFormData({
      routeCode: nextCode,
      routeName: `${r.routeName} (Scenario Copy)`,
      businessGroup: r.businessGroup || "ELASTIC",
      operationType: r.operationType || "",
      originLocationId: r.originLocationId,
      totalDistanceKm: String(r.totalDistanceKm || ""),
      remarks: r.remarks || "",
      active: 1,
      stops:
        deliveryStops.length > 0
          ? deliveryStops
          : [{ locationId: "", cumulativeDistanceKm: "" }],
    });
    setIsModalOpen(true);
  };

  const handleAddStop = () => {
    setFormData((prev) => {
      const nextStops = [...prev.stops, { locationId: "", cumulativeDistanceKm: "" }];
      return {
        ...prev,
        stops: nextStops,
        routeName: computeRouteName(prev.originLocationId, nextStops),
      };
    });
  };

  const handleRemoveStop = (index: number) => {
    setFormData((prev) => {
      const nextStops = prev.stops.filter((_, i) => i !== index);
      const finalStops = nextStops.length > 0 ? nextStops : [{ locationId: "", cumulativeDistanceKm: "" }];
      return {
        ...prev,
        stops: finalStops,
        routeName: computeRouteName(prev.originLocationId, finalStops),
      };
    });
  };

  const handleOriginChange = (originId: string) => {
    setFormData((prev) => {
      const originLoc = locations.find((l) => String(l.id) === String(originId));
      let bg = prev.businessGroup;
      if (originLoc && originLoc.businessGroup) {
        const oBg = originLoc.businessGroup.toUpperCase();
        if (oBg === "ELASTIC" || oBg === "YARN") bg = oBg;
      }
      return {
        ...prev,
        originLocationId: originId,
        businessGroup: bg,
        routeName: computeRouteName(originId, prev.stops),
      };
    });
  };

  const handleStopLocationChange = async (index: number, locationId: string) => {
    setFormData((prev) => {
      const nextStops = [...prev.stops];
      nextStops[index] = { ...nextStops[index], locationId };
      return {
        ...prev,
        stops: nextStops,
        routeName: computeRouteName(prev.originLocationId, nextStops),
      };
    });

    if (locationId && formData.originLocationId) {
      await fetchSuggestedDistance(index, formData.originLocationId, locationId);
    }
  };

  const fetchSuggestedDistance = async (
    index: number,
    originId: number | string,
    locationId: string
  ) => {
    try {
      const res = await fetch(
        `/api/routes/suggest-distance?origin_id=${originId}&location_id=${locationId}&current_route_id=${formData.id || 0}`
      );
      const data = await res.json();
      if (data.success && data.distance_km) {
        setFormData((prev) => {
          const nextStops = [...prev.stops];
          nextStops[index] = {
            ...nextStops[index],
            cumulativeDistanceKm: String(data.distance_km),
            isDirect: data.is_direct,
            sourceRoute: data.source_route,
          };

          // Auto update total distance if not manually set or smaller
          const maxKm = Math.max(
            ...nextStops.map((s) => parseFloat(s.cumulativeDistanceKm || "0")).filter((k) => !isNaN(k))
          );

          return {
            ...prev,
            stops: nextStops,
            totalDistanceKm: prev.totalDistanceKm ? prev.totalDistanceKm : maxKm > 0 ? String(maxKm) : prev.totalDistanceKm,
          };
        });
      }
    } catch (e) {
      console.error("Distance suggestion failed:", e);
    }
  };

  const handleMoveStop = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.stops.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    setFormData((prev) => {
      const copy = [...prev.stops];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return {
        ...prev,
        stops: copy,
        routeName: computeRouteName(prev.originLocationId, copy),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const validStops = formData.stops.filter(
        (s) => s.locationId && parseFloat(s.cumulativeDistanceKm || "0") > 0
      );

      if (validStops.length === 0) {
        setErrorMessage("Please specify at least 1 destination stop with distance (KM > 0).");
        setIsSubmitting(false);
        return;
      }

      if (!formData.totalDistanceKm || parseFloat(formData.totalDistanceKm) <= 0) {
        setErrorMessage("Please enter total route round-trip distance (Final KM).");
        setIsSubmitting(false);
        return;
      }

      const method = modalMode === "edit" ? "PUT" : "POST";
      const res = await fetch("/api/routes", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          stops: validStops,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.status !== "success") {
        setErrorMessage(json.message || "Failed to save route");
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      router.refresh();
      const listRes = await fetch("/api/routes");
      const listJson = await listRes.json();
      if (listJson.data) setRoutes(listJson.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isDeleting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/routes?id=${isDeleting.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        setIsDeleting(null);
        router.refresh();
        const listRes = await fetch("/api/routes");
        const listJson = await listRes.json();
        if (listJson.data) setRoutes(listJson.data);
      } else {
        alert(json.message || "Error deleting route");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const rows = filteredRoutes.map((rt) => ({
      "Route Code": rt.routeCode,
      "Route Name": rt.routeName,
      "Business Group": rt.businessGroup || "ELASTIC",
      "Origin Hub": rt.originLocation?.locationName || "-",
      "Stops Count": (rt.stops || []).filter((s) => s.stopSequence > 0).length,
      "Standard KM": Number(rt.totalDistanceKm) || 0,
      "Operation Type": rt.operationType || "Any",
      "Status": rt.active ? "Active" : "Inactive",
      "Remarks": rt.remarks || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RoutesMaster");
    XLSX.writeFile(
      wb,
      `STR_Routes_Master_${selectedBg}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="flex flex-col space-y-3 w-full min-h-0">
      {/* Top Filter, Search & Actions Toolbar (Matching PHP Toolbar) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
          {/* Segmented Tab Switcher */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedBg("ELASTIC")}
              className={`h-7 px-2.5 sm:px-3 rounded-md font-bold text-xs transition cursor-pointer ${
                selectedBg === "ELASTIC"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Elastic ({elasticCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedBg("YARN")}
              className={`h-7 px-2.5 sm:px-3 rounded-md font-bold text-xs transition cursor-pointer ${
                selectedBg === "YARN"
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Yarn ({yarnCount})
            </button>
          </div>

          {/* Route Search Input */}
          <div className="relative w-full sm:w-48 md:w-60">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route code, name..."
              className="w-full h-8 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          <span className="h-8 inline-flex items-center text-xs font-semibold text-slate-500 bg-slate-50 px-2 sm:px-2.5 rounded-lg border border-slate-200 tabular-nums whitespace-nowrap">
            <span className="hidden xs:inline">Total:&nbsp;</span>{filteredRoutes.length}<span className="hidden xs:inline">&nbsp;Routes</span><span className="xs:hidden">&nbsp;Rts</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 justify-end w-full sm:w-auto pt-1 sm:pt-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="h-8 inline-flex items-center gap-1 px-2 sm:px-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="hidden xs:inline">Export Excel</span>
            <span className="xs:hidden">Excel</span>
          </button>

          <Link
            href="/routes/create"
            className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Create Route</span>
            <span className="xs:hidden">Create</span>
          </Link>
        </div>
      </div>

      {/* Sticky Table Container matching PHP */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-175px)] scrollbar-thin">
          <table className="w-full text-left border-collapse min-w-max text-[11px] leading-tight">
            <thead className="sticky top-0 z-20 shadow-xs bg-slate-200 border-b border-slate-300">
              <tr className="text-[10.5px] uppercase tracking-wider text-slate-800 font-bold">
                <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 w-32">Route Code</th>
                <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300">Route Name & Sequence</th>
                <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 w-44">Origin Hub</th>
                <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 w-28 text-center">Stops</th>
                <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 w-32 text-right">Standard KM</th>
                <th className="px-3 py-2 whitespace-nowrap border-r border-slate-300 w-28 text-center">Status</th>
                <th className="px-3 py-2 whitespace-nowrap text-right w-36 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No routes configured</p>
                    <p className="text-[11px] text-slate-400 mt-1">Create a delivery route to define distance profiles.</p>
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((rt) => {
                  const deliveryStopCount = (rt.stops || []).filter((s) => s.stopSequence > 0).length;
                  const km = Number(rt.totalDistanceKm) || 0;

                  return (
                    <tr key={rt.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                      {/* Route Code */}
                      <td className="px-3 py-2 border-r border-slate-100 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
                          {rt.routeCode}
                        </span>
                      </td>

                      {/* Route Name */}
                      <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-100 max-w-[360px] truncate" title={rt.routeName}>
                        {rt.routeName}
                      </td>

                      {/* Origin Hub */}
                      <td className="px-3 py-2 text-slate-700 font-medium border-r border-slate-100 whitespace-nowrap">
                        {rt.originLocation?.locationName || "-"}
                      </td>

                      {/* Stops */}
                      <td className="px-3 py-2 text-center border-r border-slate-100 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                          {deliveryStopCount} Stops
                        </span>
                      </td>

                      {/* Standard KM */}
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800 border-r border-slate-100 whitespace-nowrap">
                        {km > 0 ? `${km.toFixed(1)} KM` : "-"}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 text-center border-r border-slate-100 whitespace-nowrap">
                        {rt.active === 1 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-right whitespace-nowrap pr-4 font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingRoute(rt)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10.5px] font-semibold transition border border-slate-200"
                            title="View Details"
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => openCloneModal(rt)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10.5px] font-semibold transition border border-indigo-200 inline-flex items-center gap-1"
                            title="Clone Scenario Route"
                          >
                            <Copy className="w-3 h-3" />
                            <span>Clone</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(rt)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10.5px] font-semibold transition border border-slate-200"
                            title="Edit Route"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setIsDeleting(rt)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10.5px] font-semibold transition border border-rose-200"
                            title="Delete Route"
                          >
                            Delete
                          </button>
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

      {/* View Route Details Modal */}
      {viewingRoute && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0">
                  <RouteIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{viewingRoute.routeCode}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">{viewingRoute.routeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRoute(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Origin Hub</span>
                <span className="font-bold text-slate-800 text-xs">{viewingRoute.originLocation?.locationName || "-"}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">Total Round-Trip Distance</span>
                <span className="font-bold text-blue-900 text-sm tabular-nums">{Number(viewingRoute.totalDistanceKm) || 0} KM</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Route Sequence Stops:</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                {(viewingRoute.stops || []).map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center border border-blue-200">
                        {s.stopSequence === 0 ? "O" : s.stopSequence}
                      </span>
                      <div>
                        <span className="font-bold text-slate-800">{s.location?.locationName}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-medium">({s.location?.locationType})</span>
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-bold text-slate-800">{Number(s.cumulativeDistanceKm) || 0} KM</span>
                      <span className="text-[10px] text-slate-400 block">Leg: {Number(s.legDistanceKm) || 0} KM</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRoute(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit / Clone Modal (Wide max-w-6xl, small crisp font, perfectly spaced single-row stops) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-[96vw] max-w-6xl my-4 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0">
                  <RouteIcon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {modalMode === "edit" ? "Edit Route" : modalMode === "clone" ? "Clone Route Scenario" : "New Route"}
                  </h2>
                  <p className="text-[11px] text-slate-500">Route sequencing &amp; multi-stop distance mapping</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mx-6 mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[calc(86vh-110px)] text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left 7 Cols: Journey Route & Stops Sequence */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="bg-slate-50/50 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          1. Journey Route &amp; Stops Sequence
                        </span>
                      </div>
                      <span className="text-[10.5px] text-slate-400">Origin to Destinations</span>
                    </div>

                    {/* Origin Location */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Origin Location (Start Hub) <span className="text-rose-500">*</span></span>
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold uppercase">
                          Start
                        </span>
                      </label>
                      <select
                        value={formData.originLocationId}
                        onChange={(e) => handleOriginChange(e.target.value)}
                        required
                        className="w-full text-xs font-semibold rounded-lg border border-slate-300 p-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- Select Origin Location --</option>
                        {typeOrder.map((t) => {
                          const locs = groupedLocations[t] || [];
                          if (locs.length === 0) return null;
                          return (
                            <optgroup key={t} label={typeLabels[t] || t}>
                              {locs.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.locationName}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>

                    {/* Stops List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                            <Layers className="w-3.5 h-3.5 text-blue-600" />
                            <span>Delivery Stops &amp; Direct KM <span className="text-rose-500">*</span></span>
                          </label>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddStop}
                          className="px-2.5 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 font-bold transition cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Stop</span>
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        {formData.stops.map((stop, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-2xs hover:border-blue-300 transition"
                          >
                            <span className="w-14 text-center shrink-0 text-[10.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 py-1 px-1.5 rounded-md">
                              Stop {idx + 1}
                            </span>

                            <select
                              value={stop.locationId}
                              onChange={(e) => handleStopLocationChange(idx, e.target.value)}
                              required
                              className="flex-1 min-w-0 text-xs font-semibold rounded-lg border border-slate-300 py-1 px-2 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 truncate"
                            >
                              <option value="">-- Select Destination --</option>
                              {typeOrder.map((t) => {
                                const locs = groupedLocations[t] || [];
                                if (locs.length === 0) return null;
                                return (
                                  <optgroup key={t} label={typeLabels[t] || t}>
                                    {locs.map((l) => (
                                      <option key={l.id} value={l.id}>
                                        {l.locationName}
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>

                            <div className="relative w-28 shrink-0">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                required
                                value={stop.cumulativeDistanceKm}
                                onChange={(e) => {
                                  const nextStops = [...formData.stops];
                                  nextStops[idx].cumulativeDistanceKm = e.target.value;
                                  setFormData({ ...formData, stops: nextStops });
                                }}
                                placeholder="KM *"
                                className="w-full text-xs font-semibold rounded-lg border border-slate-300 py-1 pl-2 pr-7 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 tabular-nums"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                                KM
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (stop.locationId && formData.originLocationId) {
                                  fetchSuggestedDistance(idx, formData.originLocationId, stop.locationId);
                                }
                              }}
                              className="p-1 rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition cursor-pointer shrink-0"
                              title="Auto-find known distance from Origin"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            {/* Reorder buttons */}
                            <div className="flex items-center shrink-0 border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                              <button
                                type="button"
                                onClick={() => handleMoveStop(idx, "up")}
                                disabled={idx === 0}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer hover:bg-slate-100"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveStop(idx, "down")}
                                disabled={idx === formData.stops.length - 1}
                                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer hover:bg-slate-100 border-l border-slate-200"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveStop(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer shrink-0"
                              title="Remove Stop"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Total Route Distance (Final KM) */}
                    <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                          <span>Total Round-Trip Distance (Up &amp; Down KM) <span className="text-rose-500">*</span></span>
                        </label>
                        <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.2 rounded font-bold uppercase">
                          Round Trip KM
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          value={formData.totalDistanceKm}
                          onChange={(e) => setFormData({ ...formData, totalDistanceKm: e.target.value })}
                          placeholder="e.g. 185.0"
                          className="w-full text-xs font-bold text-blue-950 placeholder:text-slate-400 placeholder:font-normal rounded-lg border border-blue-300 py-1.5 pl-3 pr-10 bg-white focus:ring-1 focus:ring-blue-500 tabular-nums"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-xs text-blue-600">
                          KM
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 mt-1">
                        Trip costing and fleet billing will calculate automatically from this round-trip distance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right 5 Cols: Route Profile & Settings */}
                <div className="lg:col-span-5 space-y-3">
                  <div className="bg-slate-50/50 rounded-xl border border-slate-200/80 p-4 space-y-3">
                    <div className="border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <RouteIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                          2. Route Profile &amp; Settings
                        </span>
                      </div>
                      <span className="text-[10.5px] text-slate-400">Settings</span>
                    </div>

                    {/* Route Code */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Route Code <span className="text-rose-500">*</span></span>
                        {modalMode === "edit" && (
                          <span className="text-[10px] text-slate-400 font-normal flex items-center gap-0.5">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        readOnly={modalMode === "edit"}
                        value={formData.routeCode}
                        onChange={(e) => setFormData({ ...formData, routeCode: e.target.value })}
                        placeholder="e.g. RTE-0025"
                        className={`w-full text-xs font-bold rounded-lg border border-slate-300 py-1.5 px-2.5 tabular-nums ${
                          modalMode === "edit" ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white"
                        }`}
                      />
                    </div>

                    {/* Route Name */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Route Name <span className="text-rose-500">*</span></span>
                        <span className="text-[10px] text-slate-400 font-normal">Auto-generates</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.routeName}
                        onChange={(e) => setFormData({ ...formData, routeName: e.target.value })}
                        placeholder="e.g. Biyagama -> Horana -> Gampaha"
                        className="w-full text-xs font-semibold rounded-lg border border-slate-300 py-1.5 px-2.5 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Business Group & Operation Type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Business Group <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={formData.businessGroup}
                          onChange={(e) => setFormData({ ...formData, businessGroup: e.target.value })}
                          required
                          className="w-full text-xs font-semibold rounded-lg border border-slate-300 py-1.5 px-2 bg-white focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="ELASTIC">Elastic</option>
                          <option value="YARN">Yarn</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Operation Type</label>
                        <select
                          value={formData.operationType}
                          onChange={(e) => setFormData({ ...formData, operationType: e.target.value })}
                          className="w-full text-xs font-semibold rounded-lg border border-slate-300 py-1.5 px-2 bg-white focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">-- Any --</option>
                          <option value="FG">Finished Goods</option>
                          <option value="RM">Raw Materials</option>
                          <option value="INT">Internal Transfer</option>
                        </select>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Route Remarks</label>
                      <textarea
                        rows={2}
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="Transit instructions, highway notes, gate restrictions..."
                        className="w-full text-xs rounded-lg border border-slate-300 p-2 bg-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Active Checkbox */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.active === 1}
                          onChange={(e) => setFormData({ ...formData, active: e.target.checked ? 1 : 0 })}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Active Route</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving Route..." : modalMode === "edit" ? "Update Route" : "Save Route Master"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleting && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Delete Route {isDeleting.routeCode}?</h3>
                <p className="text-xs text-slate-500">{isDeleting.routeName}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
              If this route has historical trips or vehicle requests, it will be archived safely (`active = 0`). Historical trip sheets remain 100% intact.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleting(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? "Deleting..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
