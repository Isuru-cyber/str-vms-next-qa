"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  Building2,
  Phone,
  CreditCard,
  User,
  Tag,
  Filter,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AdhocVehicleItem {
  id: number;
  vehicleNumber: string;
  vehicleCategory: string;
  transporterName: string | null;
  status: string;
  active: number;
  drivers?: Array<{
    id: number;
    name: string;
    mobile: string;
    nic: string;
    status: string;
  }>;
}

interface AdhocFleetRegistryClientProps {
  initialVehicles: AdhocVehicleItem[];
  vehicleCategories: Array<{ id: number; code: string; name: string }>;
}

export function AdhocFleetRegistryClient({
  initialVehicles = [],
  vehicleCategories = [],
}: AdhocFleetRegistryClientProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<AdhocVehicleItem[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<AdhocVehicleItem | null>(null);

  const categoriesList = useMemo(() => {
    if (vehicleCategories && vehicleCategories.length > 0) {
      return vehicleCategories;
    }
    return [
      { id: 1, code: "LORRY", name: "Lorry" },
      { id: 2, code: "BIKE", name: "Bike" },
      { id: 3, code: "THREEWHEEL", name: "Threewheel" },
      { id: 4, code: "VAN", name: "Van" },
    ];
  }, [vehicleCategories]);

  // Form Fields
  const [formVehNumber, setFormVehNumber] = useState("");
  const [formCategory, setFormCategory] = useState("Lorry");
  const [formTransporter, setFormTransporter] = useState("");
  const [formDriverName, setFormDriverName] = useState("");
  const [formDriverMobile, setFormDriverMobile] = useState("");
  const [formDriverNic, setFormDriverNic] = useState("");
  const [formStatus, setFormStatus] = useState("AVAILABLE");
  const [formActive, setFormActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Open modal for Adding
  const openAdd = () => {
    setEditingVehicle(null);
    setFormVehNumber("");
    setFormCategory(categoriesList[0]?.name || "Lorry");
    setFormTransporter("");
    setFormDriverName("");
    setFormDriverMobile("");
    setFormDriverNic("");
    setFormStatus("AVAILABLE");
    setFormActive(true);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Open modal for Editing
  const openEdit = (v: AdhocVehicleItem) => {
    setEditingVehicle(v);
    setFormVehNumber(v.vehicleNumber);
    setFormCategory(v.vehicleCategory || "Lorry");
    setFormTransporter(v.transporterName || "");
    const primaryDriver = v.drivers?.[0];
    setFormDriverName(primaryDriver?.name || "");
    setFormDriverMobile(primaryDriver?.mobile || "");
    setFormDriverNic(primaryDriver?.nic || "");
    setFormStatus(v.status || "AVAILABLE");
    setFormActive(v.active === 1);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const payload: any = {
        vehicleNumber: formVehNumber.trim().toUpperCase(),
        vehicleCategory: formCategory,
        transporterName: formTransporter.trim(),
        driverName: formDriverName.trim(),
        driverMobile: formDriverMobile.trim(),
        driverNic: formDriverNic.trim(),
        status: formStatus,
        active: formActive,
      };

      if (editingVehicle) {
        payload.id = editingVehicle.id;
        const res = await fetch("/api/fleet/adhoc", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to update ad-hoc vehicle.");

        setVehicles((prev) =>
          prev.map((item) =>
            item.id === editingVehicle.id
              ? {
                  ...item,
                  vehicleNumber: payload.vehicleNumber,
                  vehicleCategory: payload.vehicleCategory,
                  transporterName: payload.transporterName,
                  status: payload.status,
                  active: payload.active ? 1 : 0,
                  drivers: [
                    {
                      id: item.drivers?.[0]?.id || 0,
                      name: payload.driverName,
                      mobile: payload.driverMobile,
                      nic: payload.driverNic,
                      status: payload.status,
                    },
                  ],
                }
              : item
          )
        );
      } else {
        const res = await fetch("/api/fleet/adhoc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to register ad-hoc vehicle.");

        const newVeh: AdhocVehicleItem = {
          ...data.data.vehicle,
          drivers: [data.data.driver],
        };
        setVehicles((prev) => [newVeh, ...prev]);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deactivate handler
  const handleDelete = async (id: number, vehNo: string) => {
    if (!confirm(`Are you sure you want to deactivate outside vehicle ${vehNo}?`)) return;

    try {
      const res = await fetch(`/api/fleet/adhoc?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to deactivate vehicle.");

      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, active: 0, status: "INACTIVE" } : v))
      );
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error deactivating vehicle.");
    }
  };

  // Filtered list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (categoryFilter !== "ALL" && v.vehicleCategory !== categoryFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const driver = v.drivers?.[0];
      return (
        v.vehicleNumber.toLowerCase().includes(q) ||
        (v.transporterName && v.transporterName.toLowerCase().includes(q)) ||
        (driver && driver.name.toLowerCase().includes(q)) ||
        (driver && driver.mobile.toLowerCase().includes(q)) ||
        (driver && driver.nic.toLowerCase().includes(q))
      );
    });
  }, [vehicles, categoryFilter, search]);

  return (
    <div className="flex flex-col space-y-2.5 w-full min-h-0">
      {/* Slim Header & Action Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 px-1">
          <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Outside & Ad-Hoc Vehicles</span>
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold tabular-nums">
            {categoryFilter !== "ALL" || search ? `${filteredVehicles.length} of ${vehicles.length}` : vehicles.length} Vehicles
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-bold bg-transparent text-slate-700 px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categoriesList.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-36 sm:w-48 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, driver..."
              className="w-full h-8 text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>

          <button
            type="button"
            onClick={openAdd}
            className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Register Outside Vehicle</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Vehicle Number</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Category</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Transporter / Company</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Driver Name</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Mobile</th>
                <th className="py-2.5 px-3 whitespace-nowrap">NIC / ID No</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Active</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No outside vehicles registered</p>
                    <p className="text-xs text-slate-400">Click &quot;Register Outside Vehicle&quot; to add a new third-party vehicle.</p>
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const driver = v.drivers?.[0];
                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Vehicle Number */}
                      <td className="py-2.5 px-3 font-bold text-gray-900 tracking-tight whitespace-nowrap">
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                          {v.vehicleNumber}
                        </span>
                      </td>

                      {/* Category Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          <Tag className="w-3 h-3 text-blue-500" />
                          <span>{v.vehicleCategory || "Lorry"}</span>
                        </span>
                      </td>

                      {/* Transporter */}
                      <td className="py-2.5 px-3 text-gray-700 font-medium whitespace-nowrap">
                        {v.transporterName ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{v.transporterName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Direct / Self</span>
                        )}
                      </td>

                      {/* Driver Name */}
                      <td className="py-2.5 px-3 text-gray-900 font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{driver?.name || "N/A"}</span>
                        </div>
                      </td>

                      {/* Driver Mobile */}
                      <td className="py-2.5 px-3 font-medium text-gray-700 whitespace-nowrap">
                        {driver?.mobile ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <a href={`tel:${driver.mobile}`} className="hover:underline">
                              {driver.mobile}
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Driver NIC */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                        {driver?.nic ? (
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{driver.nic}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={v.status} />
                      </td>

                      {/* Active Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {v.active === 1 ? (
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
                      <td className="py-2.5 px-3 text-right whitespace-nowrap pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Vehicle & Driver"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {v.active === 1 && (
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id, v.vehicleNumber)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Deactivate Vehicle"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingVehicle
                      ? `Edit Outside Vehicle: ${editingVehicle.vehicleNumber}`
                      : "Register Outside / Ad-Hoc Vehicle"}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">External transporter, vehicle & driver registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Vehicle Number & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vehicle Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formVehNumber}
                    onChange={(e) => setFormVehNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. WP ND-4521"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold uppercase bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Vehicle Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-white cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transporter Company */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Transporter / Supplier Company Name
                </label>
                <input
                  type="text"
                  value={formTransporter}
                  onChange={(e) => setFormTransporter(e.target.value)}
                  placeholder="e.g. City Express Transport, Sunil TukTuk Stand"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-white"
                />
              </div>

              {/* Driver Details Box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                  Driver Information
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Driver Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formDriverName}
                      onChange={(e) => setFormDriverName(e.target.value)}
                      placeholder="e.g. Sunil Shantha"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={formDriverMobile}
                      onChange={(e) => setFormDriverMobile(e.target.value)}
                      placeholder="e.g. 077-1234567"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Driver NIC / National ID Number
                  </label>
                  <input
                    type="text"
                    value={formDriverNic}
                    onChange={(e) => setFormDriverNic(e.target.value.toUpperCase())}
                    placeholder="e.g. 198524601245 or 852461245V"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono bg-white uppercase"
                  />
                </div>
              </div>

              {/* Status and Active */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-slate-700">Operational Status:</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="text-xs px-2.5 py-1 border border-slate-300 rounded-lg font-bold bg-white"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ON_TRIP">ON_TRIP</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => setFormActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-700">Active Record</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="h-8 px-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingVehicle ? "Update Vehicle" : "Register Vehicle"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
