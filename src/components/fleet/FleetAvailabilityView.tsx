"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  CheckCircle2,
  GitMerge,
  Wrench,
  Compass,
  Search,
  Calendar,
  Layers,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/utils";

export interface VehicleAvailabilityItem {
  id: number;
  vehicleNumber: string;
  vehicleType: string;
  maxPayloadKg: number;
  paymentBasis: string;
  status: string;
  activeTripNo?: string | null;
  activeTripId?: number | null;
  driverName?: string | null;
  driverPhone?: string | null;
  mtdKm: number;
  mtdTrips: number;
  targetLimit: number;
  utilizationPct: number;
  homePlant: string;
}

interface FleetAvailabilityViewProps {
  initialVehicles: VehicleAvailabilityItem[];
  selectedMonth: string;
}

export function FleetAvailabilityView({
  initialVehicles,
  selectedMonth: initialMonth,
}: FleetAvailabilityViewProps) {
  const [vehicles] = useState<VehicleAvailabilityItem[]>(initialVehicles);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const filteredVehicles = vehicles.filter((v) => {
    if (statusFilter !== "ALL") {
      if (statusFilter === "AVAILABLE" && v.status !== "AVAILABLE") return false;
      if (statusFilter === "ALLOCATED" && !["ALLOCATED", "IN_TRIP"].includes(v.status))
        return false;
      if (statusFilter === "MAINTENANCE" && v.status !== "MAINTENANCE") return false;
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      const matchVeh = v.vehicleNumber.toLowerCase().includes(term);
      const matchType = v.vehicleType.toLowerCase().includes(term);
      const matchDriver = (v.driverName || "").toLowerCase().includes(term);
      const matchPlant = v.homePlant.toLowerCase().includes(term);
      if (!matchVeh && !matchType && !matchDriver && !matchPlant) return false;
    }

    return true;
  });

  const totalFleet = vehicles.length;
  const availableCount = vehicles.filter((v) => v.status === "AVAILABLE").length;
  const allocatedCount = vehicles.filter((v) =>
    ["ALLOCATED", "IN_TRIP"].includes(v.status)
  ).length;
  const maintenanceCount = vehicles.filter((v) => v.status === "MAINTENANCE").length;
  const totalMtdKm = vehicles.reduce((sum, v) => sum + v.mtdKm, 0);

  const availablePct = totalFleet > 0 ? Math.round((availableCount / totalFleet) * 100) : 0;
  const allocatedPct = totalFleet > 0 ? Math.round((allocatedCount / totalFleet) * 100) : 0;

  return (
    <div className="space-y-3 w-full min-w-0">
      {/* Slim Header & Filters Bar (No bulky card, no subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pt-1">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Fleet Availability</h1>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              window.location.href = `/fleet/availability?month=${e.target.value}`;
            }}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 tabular-nums shadow-2xs"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">🟢 Available Only</option>
            <option value="ALLOCATED">🔵 Allocated / On Trip</option>
            <option value="MAINTENANCE">🟠 Maintenance</option>
          </select>

          <Link
            href="/fleet/vehicles"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200 shadow-2xs"
          >
            Fleet Master
          </Link>
        </div>
      </div>

      {/* 5 Metric Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-gray-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Fleet</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900 tracking-tight tabular-nums">{totalFleet}</span>
            <span className="text-[11px] text-gray-400">Lorries</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl p-3.5 sm:p-4 border border-emerald-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Available Now</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700 tracking-tight tabular-nums">{availableCount}</span>
            <span className="text-[11px] font-bold text-emerald-600">{availablePct}% Ready</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-3.5 sm:p-4 border border-blue-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Allocated</span>
            <GitMerge className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-700 tracking-tight tabular-nums">{allocatedCount}</span>
            <span className="text-[11px] font-bold text-blue-600">{allocatedPct}% Active</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-3.5 sm:p-4 border border-amber-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-700 tracking-tight tabular-nums">{maintenanceCount}</span>
            <span className="text-[11px] font-bold text-amber-600">Workshop</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-white rounded-xl p-3.5 sm:p-4 border border-purple-200 shadow-xs space-y-1.5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[10px] font-bold uppercase tracking-wider">MTD Distance</span>
            <Compass className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-800 tracking-tight tabular-nums">
              {formatNumber(totalMtdKm, 0)}
            </span>
            <span className="text-[11px] font-bold text-purple-600">KM</span>
          </div>
        </div>
      </div>

      {/* Main Vehicles Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-indigo-600" />
            <span>Fleet Availability ({filteredVehicles.length})</span>
          </h3>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, driver, plant..."
              className="w-64 text-xs bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3.5 font-bold">Vehicle No</th>
                <th className="py-2.5 px-3 font-bold">Type</th>
                <th className="py-2.5 px-3 font-bold">Home Plant</th>
                <th className="py-2.5 px-3 font-bold text-right">Max Payload</th>
                <th className="py-2.5 px-3 font-bold text-center">Status</th>
                <th className="py-2.5 px-3 font-bold">Active Trip</th>
                <th className="py-2.5 px-3 font-bold">Assigned Driver</th>
                <th className="py-2.5 px-3 font-bold">Driver Phone</th>
                <th className="py-2.5 px-3 font-bold">Payment Basis</th>
                <th className="py-2.5 px-3 font-bold text-right">MTD Distance</th>
                <th className="py-2.5 px-3 font-bold text-center">MTD Trips</th>
                <th className="py-2.5 px-3.5 font-bold text-right">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400">
                    No fleet vehicles matching the criteria
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const progressPct = Math.min(100, v.utilizationPct);

                  let barColor = "bg-emerald-500";
                  if (v.utilizationPct > 100) barColor = "bg-rose-500";
                  else if (v.utilizationPct > 85) barColor = "bg-amber-500";

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Vehicle Number (No icon, clean single line) */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-gray-900 text-xs tracking-tight">
                          {v.vehicleNumber}
                        </span>
                      </td>

                      {/* Vehicle Type */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-700 text-xs font-medium">
                        {v.vehicleType}
                      </td>

                      {/* Home Plant */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 text-xs">
                        {v.homePlant}
                      </td>

                      {/* Capacity / Max Payload */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right text-gray-700 text-xs font-medium tabular-nums">
                        {formatNumber(v.maxPayloadKg, 0)} KG
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center">
                        <StatusBadge status={v.status} />
                      </td>

                      {/* Active Trip */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {v.activeTripNo ? (
                          <Link
                            href={`/allocations/fg/combine/${v.activeTripId || ""}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md hover:underline"
                            title="View Active Trip"
                          >
                            <span>{v.activeTripNo}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </Link>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Driver Name */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="font-medium text-gray-800 text-xs">
                          {v.driverName || "Unassigned"}
                        </span>
                      </td>

                      {/* Driver Phone */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-600 text-xs tabular-nums">
                        {v.driverPhone || "-"}
                      </td>

                      {/* Payment Basis */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] border border-slate-200">
                          {v.paymentBasis}
                        </span>
                      </td>

                      {/* MTD Running KM */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-right font-bold text-gray-900 text-xs tabular-nums">
                        {formatNumber(v.mtdKm, 1)} KM
                      </td>

                      {/* MTD Trips */}
                      <td className="py-2.5 px-3 whitespace-nowrap text-center text-gray-700 text-xs tabular-nums">
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                          {v.mtdTrips} Trips
                        </span>
                      </td>

                      {/* Utilization */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2 justify-end min-w-[130px]">
                          <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`${barColor} h-1.5 rounded-full transition-all duration-300`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold text-xs tabular-nums ${
                              v.utilizationPct > 100
                                ? "text-rose-600"
                                : v.utilizationPct > 85
                                ? "text-amber-600"
                                : "text-emerald-700"
                            }`}
                          >
                            {v.utilizationPct.toFixed(1)}%
                          </span>
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
    </div>
  );
}
