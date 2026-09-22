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
    <div className="space-y-3">
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
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-6 font-bold">Vehicle Details</th>
                <th className="py-3 px-6 font-bold">Real-Time Status</th>
                <th className="py-3 px-6 font-bold">Assigned Driver</th>
                <th className="py-3 px-6 font-bold">Payment Basis</th>
                <th className="py-3 px-6 font-bold">MTD Running</th>
                <th className="py-3 px-6 font-bold">Utilization Progress</th>
                <th className="py-3 px-6 font-bold text-right">Target Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    No fleet vehicles matching the criteria
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const isKmBased = v.paymentBasis === "KM_BASED";
                  const progressPct = Math.min(100, v.utilizationPct);

                  let barColor = "bg-emerald-500";
                  if (v.utilizationPct > 100) barColor = "bg-rose-500";
                  else if (v.utilizationPct > 85) barColor = "bg-amber-500";

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {v.vehicleNumber.slice(0, 3)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 block text-sm tracking-tight">
                              {v.vehicleNumber}
                            </span>
                            <span className="text-[10px] text-gray-500">
                              {v.vehicleType} &bull; Max {formatNumber(v.maxPayloadKg, 0)} KG &bull;{" "}
                              {v.homePlant}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={v.status} />
                          {v.activeTripNo && (
                            <Link
                              href={`/allocations/fg/combine/${v.activeTripId || ""}`}
                              className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-0.5"
                            >
                              <span>{v.activeTripNo}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        {v.driverName ? (
                          <div>
                            <span className="font-bold text-gray-800 block">{v.driverName}</span>
                            <span className="text-[11px] text-gray-500 tabular-nums">
                              {v.driverPhone || "-"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap font-semibold text-gray-700 uppercase text-[11px]">
                        {v.paymentBasis}
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-gray-900 text-sm block tabular-nums">
                            {formatNumber(v.mtdKm, 1)} KM
                          </span>
                          <span className="text-[10px] text-gray-400 tabular-nums">
                            {v.mtdTrips} Trip(s) Completed
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap min-w-[200px]">
                        {isKmBased ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] tabular-nums text-gray-500">
                              <span>Rate per KM basis</span>
                              <span>{formatNumber(v.mtdKm, 0)} KM run</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-2 rounded-full"
                                style={{ width: `${Math.min(100, (v.mtdKm / 3000) * 100)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] tabular-nums text-gray-500">
                              <span>
                                {formatNumber(v.mtdKm, 0)} / {formatNumber(v.targetLimit, 0)} KM
                              </span>
                              <span
                                className={
                                  v.utilizationPct > 100 ? "text-rose-600 font-bold" : ""
                                }
                              >
                                {v.utilizationPct > 100
                                  ? `+${formatNumber(v.mtdKm - v.targetLimit, 0)} Exceeded`
                                  : `${formatNumber(v.targetLimit - v.mtdKm, 0)} Rem.`}
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`${barColor} h-2 rounded-full transition-all duration-500`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-6 whitespace-nowrap text-right font-bold text-sm tabular-nums">
                        <span
                          className={
                            v.utilizationPct > 100
                              ? "text-rose-600"
                              : v.utilizationPct > 85
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }
                        >
                          {v.utilizationPct.toFixed(1)}%
                        </span>
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
