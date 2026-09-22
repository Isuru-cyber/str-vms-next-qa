"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Compass,
  FileSpreadsheet,
  Building2,
  Crosshair,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import * as XLSX from "xlsx";

interface PlantItem {
  id: number;
  name: string;
  code?: string | null;
}

interface LocationItem {
  id: number;
  locationName: string;
  businessGroup: string | null;
  code: string | null;
  locationType: string;
  plantId: number | null;
  customerId: number | null;
  latitude: number | string | null;
  longitude: number | string | null;
  active: number;
  isOrigin: number;
  plant?: {
    id: number;
    name: string;
    code?: string | null;
  } | null;
}

interface LocationRegistryProps {
  initialLocations: LocationItem[];
  plants?: PlantItem[];
}

export function LocationRegistry({
  initialLocations = [],
  plants = [],
}: LocationRegistryProps) {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationItem[]>(initialLocations);

  // Tabs: ELASTIC | YARN | INTERNAL | ALL
  const [activeTab, setActiveTab] = useState<"ELASTIC" | "YARN" | "INTERNAL" | "ALL">("ELASTIC");

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE

  // Notification banners
  const [notification, setNotification] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields (Display Name, Contact & Address completely removed as requested)
  const [formData, setFormData] = useState({
    locationName: "",
    businessGroup: "ELASTIC",
    locationType: "CUSTOMER",
    code: "",
    plantId: "",
    isOrigin: false,
    active: true,
    latitude: "",
    longitude: "",
  });

  // Calculate counts for tabs
  const tabCounts = useMemo(() => {
    return {
      ELASTIC: locations.filter((l) => (l.businessGroup || "ELASTIC") === "ELASTIC").length,
      YARN: locations.filter((l) => l.businessGroup === "YARN").length,
      INTERNAL: locations.filter((l) => l.businessGroup === "INTERNAL").length,
      ALL: locations.length,
    };
  }, [locations]);

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // Tab filter
      if (activeTab !== "ALL") {
        const bg = loc.businessGroup || "ELASTIC";
        if (bg !== activeTab) return false;
      }

      // Type filter
      if (typeFilter !== "ALL" && loc.locationType !== typeFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === "ACTIVE" && loc.active !== 1) return false;
      if (statusFilter === "INACTIVE" && loc.active === 1) return false;

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = loc.locationName?.toLowerCase().includes(q);
        const matchCode = loc.code?.toLowerCase().includes(q);
        const matchType = loc.locationType?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchType) {
          return false;
        }
      }

      return true;
    });
  }, [locations, activeTab, typeFilter, statusFilter, search]);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingLoc(null);
    setFormData({
      locationName: "",
      businessGroup: activeTab === "ALL" ? "ELASTIC" : activeTab,
      locationType: "CUSTOMER",
      code: "",
      plantId: "",
      isOrigin: false,
      active: true,
      latitude: "",
      longitude: "",
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (loc: LocationItem) => {
    setEditingLoc(loc);
    setFormData({
      locationName: loc.locationName || "",
      businessGroup: loc.businessGroup || "ELASTIC",
      locationType: loc.locationType || "CUSTOMER",
      code: loc.code || "",
      plantId: loc.plantId ? String(loc.plantId) : "",
      isOrigin: loc.isOrigin === 1,
      active: loc.active === 1,
      latitude: loc.latitude !== null && loc.latitude !== undefined ? String(loc.latitude) : "",
      longitude: loc.longitude !== null && loc.longitude !== undefined ? String(loc.longitude) : "",
    });
    setIsModalOpen(true);
  };

  // Submit Create or Update
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.locationName.trim()) {
      alert("Location Name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        id: editingLoc ? editingLoc.id : undefined,
        plantId: formData.plantId ? parseInt(formData.plantId, 10) : null,
      };

      const res = await fetch("/api/locations", {
        method: editingLoc ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to save location");

      if (editingLoc) {
        setLocations((prev) => prev.map((l) => (l.id === editingLoc.id ? json.data : l)));
        setNotification({
          type: "success",
          message: `Location "${json.data.locationName}" updated successfully.`,
        });
      } else {
        setLocations((prev) => [json.data, ...prev]);
        setNotification({
          type: "success",
          message: `Location "${json.data.locationName}" created successfully.`,
        });
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error saving location");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete or Archive Location
  const handleDelete = async (loc: LocationItem) => {
    const confirmMsg = `WARNING: Are you sure you want to delete or archive this location (${loc.locationName})?\n\n` +
      `- If this location has been used in trips, routes, or vehicle requests, it will be safely ARCHIVED (deactivated) to protect all historical records.\n` +
      `- If it is completely unused, it will be permanently deleted.\n\n` +
      `Do you want to proceed?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/locations?id=${loc.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete location");

      if (data.status === "archived") {
        setLocations((prev) =>
          prev.map((l) => (l.id === loc.id ? { ...l, active: 0 } : l))
        );
        setNotification({
          type: "info",
          message: `Location "${loc.locationName}" has been safely archived (active = 0). Historical trip sheets, routes & requests remain 100% intact and unaffected.`,
        });
      } else {
        setLocations((prev) => prev.filter((l) => l.id !== loc.id));
        setNotification({
          type: "success",
          message: `Location "${loc.locationName}" permanently deleted.`,
        });
      }
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error deleting location");
    }
  };

  // Excel Export
  const exportToExcel = () => {
    const exportRows = filteredLocations.map((loc) => ({
      "Location ID": `#${loc.id}`,
      "Location Name": loc.locationName,
      "Business Group": loc.businessGroup || "ELASTIC",
      "Location Code": loc.code || "",
      "Location Type": loc.locationType,
      "Plant Binding": loc.plant?.name || "None (Hub)",
      "Latitude": loc.latitude || "",
      "Longitude": loc.longitude || "",
      "Is Origin Hub": loc.isOrigin === 1 ? "YES" : "NO",
      "Status": loc.active === 1 ? "ACTIVE" : "INACTIVE",
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "LocationsMaster");
    XLSX.writeFile(
      wb,
      `STR_Locations_Master_${activeTab}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Preset coordinate shortcuts
  const applyCoordinates = (lat: string, lng: string) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  };

  return (
    <div className="flex flex-col space-y-2.5 w-full min-h-0">
      {/* Slim Header Row (No bulky card, no subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 px-1 pt-1">
        <div className="flex items-center gap-2">
          <MapPin className="text-blue-700 w-5 h-5 shrink-0" />
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Location Master</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportToExcel}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* Segmented Tab Switcher & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Segmented Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          {(["ELASTIC", "YARN", "INTERNAL", "ALL"] as const).map((tab) => {
            const isCurrent = activeTab === tab;
            const label =
              tab === "ELASTIC"
                ? "Elastic Group"
                : tab === "YARN"
                ? "Yarn Group"
                : tab === "INTERNAL"
                ? "Internal Group"
                : "All Groups";
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                  isCurrent
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums font-semibold ${
                    isCurrent
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder="Search location name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>

        {/* Location Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Types</option>
          <option value="PLANT">Plant</option>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="INTERNAL">Internal</option>
          <option value="OTHER">Other</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>

        {/* Total Summary */}
        <div className="flex-1 flex justify-end items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 tabular-nums">
            Showing <strong className="text-slate-900">{filteredLocations.length}</strong> of{" "}
            <strong>{locations.length}</strong> Locations
          </span>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition ${
            notification.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : notification.type === "info"
              ? "bg-blue-50 border border-blue-200 text-blue-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : notification.type === "info" ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 ml-3 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-210px)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 font-bold tracking-wider uppercase text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-16 text-center">ID</th>
                <th className="py-2.5 px-3 min-w-[220px]">Location Name</th>
                <th className="py-2.5 px-3 w-28 text-center">Code</th>
                <th className="py-2.5 px-3 w-28 text-center">Group</th>
                <th className="py-2.5 px-3 w-28 text-center">Location Type</th>
                <th className="py-2.5 px-3 min-w-[180px]">Plant Binding</th>
                <th className="py-2.5 px-3 min-w-[160px]">Coordinates</th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
                <th className="py-2.5 px-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLocations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No locations found</p>
                    <p className="text-xs text-slate-400">Try adjusting your search or tab filters</p>
                  </td>
                </tr>
              ) : (
                filteredLocations.map((loc) => {
                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-2 px-3 text-center tabular-nums font-semibold text-slate-400 text-[11px]">
                        #{loc.id}
                      </td>

                      {/* Location Name */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{loc.locationName}</span>
                          {loc.isOrigin === 1 && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded font-bold">
                              Origin Hub
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-2 px-3 text-center">
                        {loc.code ? (
                          <span className="tabular-nums font-bold text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            {loc.code}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Business Group */}
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            loc.businessGroup === "ELASTIC"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : loc.businessGroup === "YARN"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {loc.businessGroup || "ELASTIC"}
                        </span>
                      </td>

                      {/* Location Type */}
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {loc.locationType}
                        </span>
                      </td>

                      {/* Plant Binding */}
                      <td className="py-2 px-3 text-slate-700 font-medium">
                        {loc.plant ? (
                          <span className="inline-flex items-center gap-1 text-slate-800 font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            {loc.plant.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">None (Hub)</span>
                        )}
                      </td>

                      {/* Coordinates */}
                      <td className="py-2 px-3">
                        {(loc.latitude || loc.longitude) ? (
                          <div className="text-[11px] text-slate-600 tabular-nums flex items-center gap-1 font-medium">
                            <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{loc.latitude}, {loc.longitude}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center">
                        {loc.active === 1 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(loc)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                            title="Edit Location"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(loc)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                            title="Delete or Archive Location"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Form: Add or Edit Location (Clean, Spacious, Small Font) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingLoc ? "Edit Location" : "New Location"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Plant, customer &amp; destination master settings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-5 space-y-4 max-h-[calc(80vh-100px)] overflow-y-auto text-xs">
                {/* Section: Location Core Details */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Location Information
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Location Name */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Location Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.locationName}
                        onChange={(e) =>
                          setFormData({ ...formData, locationName: e.target.value })
                        }
                        placeholder="e.g. STR BIYAGAMA"
                        className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold bg-white"
                      />
                    </div>

                    {/* Business Group */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Business Group <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.businessGroup}
                        onChange={(e) =>
                          setFormData({ ...formData, businessGroup: e.target.value })
                        }
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-white"
                      >
                        <option value="ELASTIC">Elastic</option>
                        <option value="YARN">Yarn</option>
                        <option value="INTERNAL">Internal</option>
                      </select>
                    </div>

                    {/* Location Type */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Location Type <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.locationType}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setFormData({
                            ...formData,
                            locationType: newType,
                            isOrigin: newType === "PLANT" ? true : formData.isOrigin,
                          });
                        }}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-white"
                      >
                        <option value="CUSTOMER">Customer</option>
                        <option value="PLANT">Plant</option>
                        <option value="WAREHOUSE">Warehouse</option>
                        <option value="SUPPLIER">Supplier</option>
                        <option value="INTERNAL">Internal</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    {/* Code */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Location Code
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value.toUpperCase() })
                        }
                        placeholder="e.g. STR1"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold uppercase bg-white tabular-nums"
                      />
                    </div>

                    {/* Plant Binding */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Plant Binding
                      </label>
                      <select
                        value={formData.plantId}
                        onChange={(e) =>
                          setFormData({ ...formData, plantId: e.target.value })
                        }
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium bg-white"
                      >
                        <option value="">None (Hub / Standalone)</option>
                        {plants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.code ? `(${p.code})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.active}
                          onChange={(e) =>
                            setFormData({ ...formData, active: e.target.checked })
                          }
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Active Location</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isOrigin}
                          onChange={(e) =>
                            setFormData({ ...formData, isOrigin: e.target.checked })
                          }
                          className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span className="text-[11px] font-bold text-slate-700">Is Origin Hub</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Section: Geographic Coordinates */}
                <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="border-b border-slate-200/60 pb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        Geographic Coordinates
                      </span>
                    </div>
                    <span className="text-[10.5px] text-slate-400">Quick Pin Presets:</span>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: "Biyagama", lat: "6.953889", lng: "79.988056" },
                      { name: "Katunayake", lat: "7.169167", lng: "79.883889" },
                      { name: "Horana", lat: "6.716667", lng: "80.066667" },
                      { name: "Thulhiriya", lat: "7.233333", lng: "80.183333" },
                      { name: "Colombo Port", lat: "6.934444", lng: "79.842778" },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyCoordinates(preset.lat, preset.lng)}
                        className="text-[10px] px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 rounded border border-slate-200 transition font-semibold text-slate-600 cursor-pointer shadow-2xs"
                      >
                        + {preset.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="text"
                        value={formData.latitude}
                        onChange={(e) =>
                          setFormData({ ...formData, latitude: e.target.value })
                        }
                        placeholder="e.g. 6.953889"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium tabular-nums bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="text"
                        value={formData.longitude}
                        onChange={(e) =>
                          setFormData({ ...formData, longitude: e.target.value })
                        }
                        placeholder="e.g. 79.988056"
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium tabular-nums bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingLoc ? "Update Location" : "Create Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
