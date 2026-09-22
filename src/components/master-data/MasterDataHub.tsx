"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  Layers,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Loader2,
  Database,
  Building2,
} from "lucide-react";

interface MasterDataHubProps {
  initialVehicleTypes: any[];
  initialSubOperations: any[];
  initialPlants?: any[];
}

export function MasterDataHub({
  initialVehicleTypes = [],
  initialSubOperations = [],
  initialPlants = [],
}: MasterDataHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"VEHICLE_TYPE" | "SUB_OPERATION" | "PLANT">("VEHICLE_TYPE");

  const [vTypes, setVTypes] = useState(initialVehicleTypes);
  const [subOps, setSubOps] = useState(initialSubOperations);
  const [plants, setPlants] = useState(initialPlants);

  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formFuelConsumption, setFormFuelConsumption] = useState("");
  const [formRunningCost, setFormRunningCost] = useState("");
  const [formProfitPerKm, setFormProfitPerKm] = useState("15.00");
  const [formFixedCostPerDay, setFormFixedCostPerDay] = useState("1795.36");
  const [formPlantBusinessGroup, setFormPlantBusinessGroup] = useState("ELASTIC");
  const [formSortOrder, setFormSortOrder] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setEditingItem(null);
    setFormCode("");
    setFormName("");
    setFormDesc("");
    setFormFuelConsumption("");
    setFormRunningCost("");
    setFormProfitPerKm("15.00");
    setFormFixedCostPerDay("1795.36");
    setFormPlantBusinessGroup("ELASTIC");
    setFormSortOrder(activeTab === "PLANT" ? String(plants.length + 1) : "10");
    setFormActive(true);
    setIsModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormDesc(item.description || "");
    setFormFuelConsumption(
      item.defaultFuelConsumption !== null && item.defaultFuelConsumption !== undefined
        ? String(item.defaultFuelConsumption)
        : ""
    );
    setFormRunningCost(
      item.defaultRunningCostPerKm !== null && item.defaultRunningCostPerKm !== undefined
        ? String(item.defaultRunningCostPerKm)
        : ""
    );
    setFormProfitPerKm(
      item.defaultProfitPerKm !== null && item.defaultProfitPerKm !== undefined
        ? String(item.defaultProfitPerKm)
        : "15.00"
    );
    setFormFixedCostPerDay(
      item.defaultFixedCostPerDay !== null && item.defaultFixedCostPerDay !== undefined
        ? String(item.defaultFixedCostPerDay)
        : "1795.36"
    );
    setFormPlantBusinessGroup(item.businessGroup || "ELASTIC");
    setFormSortOrder(item.sortOrder !== undefined && item.sortOrder !== null ? String(item.sortOrder) : "10");
    setFormActive(item.active === 1);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activeTab === "PLANT") {
        const plantPayload: any = {
          code: formCode,
          name: formName,
          businessGroup: formPlantBusinessGroup,
          sortOrder: formSortOrder ? parseInt(formSortOrder, 10) : 10,
          active: formActive,
        };

        if (editingItem) {
          plantPayload.id = editingItem.id;
          const res = await fetch("/api/plants", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plantPayload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Error updating plant");

          setPlants((prev) =>
            prev.map((p) => (p.id === editingItem.id ? data.data : p)).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          );
        } else {
          const res = await fetch("/api/plants", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plantPayload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Error creating plant");

          setPlants((prev) => [...prev, data.data].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        }
      } else {
        const payload: any = {
          name: formName,
          code: formCode,
          description: formDesc,
          active: formActive,
        };

        if (activeTab === "VEHICLE_TYPE") {
          payload.defaultFuelConsumption = formFuelConsumption ? parseFloat(formFuelConsumption) : null;
          payload.defaultRunningCostPerKm = formRunningCost ? parseFloat(formRunningCost) : null;
          payload.defaultProfitPerKm = formProfitPerKm ? parseFloat(formProfitPerKm) : 15.0;
          payload.defaultFixedCostPerDay = formFixedCostPerDay ? parseFloat(formFixedCostPerDay) : 1795.36;
        }

        if (editingItem) {
          payload.id = editingItem.id;
          const res = await fetch("/api/master-data", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Error updating");

          if (activeTab === "VEHICLE_TYPE") {
            setVTypes((prev) => prev.map((i) => (i.id === editingItem.id ? data.data : i)));
          } else {
            setSubOps((prev) => prev.map((i) => (i.id === editingItem.id ? data.data : i)));
          }
        } else {
          payload.categoryCode = activeTab;
          const res = await fetch("/api/master-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Error creating");

          if (activeTab === "VEHICLE_TYPE") {
            setVTypes((prev) => [...prev, data.data]);
          } else {
            setSubOps((prev) => [...prev, data.data]);
          }
        }
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Error saving option");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (activeTab === "PLANT") {
      if (!confirm("Are you sure you want to deactivate this plant? Historical records will remain intact.")) return;
      try {
        const res = await fetch(`/api/plants?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Error deactivating plant");
        setPlants((prev) => prev.map((p) => (p.id === id ? { ...p, active: 0 } : p)));
        router.refresh();
      } catch (err) {
        alert("Error deactivating plant");
      }
      return;
    }

    if (!confirm("Are you sure you want to delete this option?")) return;

    try {
      const res = await fetch(`/api/master-data?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error deleting");

      if (activeTab === "VEHICLE_TYPE") {
        setVTypes((prev) => prev.filter((i) => i.id !== id));
      } else {
        setSubOps((prev) => prev.filter((i) => i.id !== id));
      }
      router.refresh();
    } catch (err) {
      alert("Error deleting");
    }
  };

  const currentList =
    activeTab === "VEHICLE_TYPE" ? vTypes : activeTab === "SUB_OPERATION" ? subOps : plants;
  const filteredList = currentList.filter(
    (i) =>
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-2.5 w-full min-h-0">
      {/* Slim Header & Action Toolbar (No bulky card, no subtitle) */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        {/* Tabs Bar */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("VEHICLE_TYPE")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "VEHICLE_TYPE"
                ? "bg-white shadow-2xs text-blue-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Vehicle Types</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 tabular-nums">
              {vTypes.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("SUB_OPERATION")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "SUB_OPERATION"
                ? "bg-white shadow-2xs text-blue-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sub-Operations</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 tabular-nums">
              {subOps.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PLANT")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "PLANT"
                ? "bg-white shadow-2xs text-blue-700"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Plants</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 tabular-nums">
              {plants.length}
            </span>
          </button>
        </div>

        {/* Search and Add Button */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search options..."
              className="w-full text-xs pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{activeTab === "PLANT" ? "Add Plant" : "Add Option"}</span>
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 max-h-[calc(100vh-190px)]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">
                  {activeTab === "VEHICLE_TYPE"
                    ? "Vehicle Type"
                    : activeTab === "SUB_OPERATION"
                    ? "Sub-Operation"
                    : "Plant Name"}
                </th>
                <th className="py-2.5 px-3 w-32 text-center">System Code</th>
                {activeTab === "VEHICLE_TYPE" ? (
                  <>
                    <th className="py-2.5 px-3 text-right">Fuel (KM/L)</th>
                    <th className="py-2.5 px-3 text-right">Running Cost</th>
                    <th className="py-2.5 px-3 text-right">Profit / KM</th>
                    <th className="py-2.5 px-3 text-right">Fixed Cost / Day</th>
                  </>
                ) : activeTab === "PLANT" ? (
                  <>
                    <th className="py-2.5 px-3 text-center">Business Group</th>
                    <th className="py-2.5 px-3 w-28 text-center">Order</th>
                  </>
                ) : (
                  <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                )}
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
                <th className="py-2.5 px-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "VEHICLE_TYPE" ? 8 : activeTab === "PLANT" ? 6 : 5}
                    className="py-12 text-center text-slate-400"
                  >
                    <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">No entries found</p>
                    <p className="text-xs text-slate-400">Click &quot;Add Option&quot; to configure a new entry.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-900">{item.name}</td>
                    <td className="py-2 px-3 text-center">
                      <span className="tabular-nums font-bold text-[11px] text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {item.code}
                      </span>
                    </td>
                    {activeTab === "VEHICLE_TYPE" ? (
                      <>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {item.defaultFuelConsumption ? `${item.defaultFuelConsumption} km/l` : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {item.defaultRunningCostPerKm ? `Rs. ${Number(item.defaultRunningCostPerKm).toFixed(2)}` : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {item.defaultProfitPerKm ? `Rs. ${Number(item.defaultProfitPerKm).toFixed(2)}` : "-"}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-slate-700">
                          {item.defaultFixedCostPerDay
                            ? `Rs. ${Number(item.defaultFixedCostPerDay).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                            : "-"}
                        </td>
                      </>
                    ) : activeTab === "PLANT" ? (
                      <>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold text-[11px]">
                            {item.businessGroup || "ELASTIC"}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-600">
                          #{item.sortOrder ?? "-"}
                        </td>
                      </>
                    ) : (
                      <td className="py-2 px-3 text-slate-600 text-[11px]">
                        {item.description || <span className="text-slate-300">-</span>}
                      </td>
                    )}
                    <td className="py-2 px-3 text-center">
                      {item.active === 1 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title={activeTab === "PLANT" ? "Deactivate" : "Delete"}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal (Clean, Spacious, Standard Typography) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                {editingItem
                  ? activeTab === "VEHICLE_TYPE"
                    ? `Edit Vehicle Type: ${editingItem.name}`
                    : activeTab === "PLANT"
                    ? `Edit Plant: ${editingItem.name}`
                    : `Edit Sub-Operation: ${editingItem.name}`
                  : activeTab === "VEHICLE_TYPE"
                  ? "Add New Vehicle Type"
                  : activeTab === "PLANT"
                  ? "Add New Plant"
                  : "Add New Sub-Operation"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    System Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder={
                      activeTab === "PLANT"
                        ? "e.g. STR4"
                        : activeTab === "VEHICLE_TYPE"
                        ? "e.g. 10_FT_LORRY"
                        : "e.g. SAMPLE"
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold uppercase bg-slate-50 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Name / Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder={
                      activeTab === "PLANT"
                        ? "e.g. STR4"
                        : activeTab === "VEHICLE_TYPE"
                        ? "e.g. 10 ft"
                        : "e.g. Raw Material"
                    }
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white transition-all"
                  />
                </div>

                {activeTab === "PLANT" && (
                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Business Group
                      </label>
                      <select
                        value={formPlantBusinessGroup}
                        onChange={(e) => setFormPlantBusinessGroup(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white"
                      >
                        <option value="ELASTIC">ELASTIC</option>
                        <option value="YARN">YARN</option>
                        <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                        Display Sequence / Order
                      </label>
                      <input
                        type="number"
                        value={formSortOrder}
                        onChange={(e) => setFormSortOrder(e.target.value)}
                        placeholder="e.g. 6"
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold bg-white"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "VEHICLE_TYPE" && (
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2.5">
                      Default Costing & Commercials
                    </label>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Fuel Consumption (km/l)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={formFuelConsumption}
                          onChange={(e) => setFormFuelConsumption(e.target.value)}
                          placeholder="e.g. 10.0"
                          className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Running Cost (Rs./km)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formRunningCost}
                          onChange={(e) => setFormRunningCost(e.target.value)}
                          placeholder="e.g. 20.50"
                          className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Profit Margin (Rs./km)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formProfitPerKm}
                          onChange={(e) => setFormProfitPerKm(e.target.value)}
                          placeholder="e.g. 15.00"
                          className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium bg-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Fixed Cost / Day (Rs.)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formFixedCostPerDay}
                          onChange={(e) => setFormFixedCostPerDay(e.target.value)}
                          placeholder="e.g. 1795.36"
                          className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "SUB_OPERATION" && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Optional description..."
                      className="w-full text-xs px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium bg-white transition-all"
                    />
                  </div>
                )}

                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span className="text-xs font-bold text-slate-700">Active Option</span>
                  </label>
                </div>
              </div>

              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : editingItem ? "Update Option" : "Create Option"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
