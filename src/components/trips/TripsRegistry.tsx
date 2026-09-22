"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  Search,
  ArrowRight,
  User,
  Layers,
  FileCheck2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber } from "@/lib/utils";

interface TripItem {
  id: number;
  tripNo: string;
  status: string;
  plannedKm: number | string | null;
  actualKm: number | string | null;
  totalTripCost: number | string | null;
  createdAt: string | Date;
  vehicle: {
    id: number;
    vehicleNumber: string;
    vehicleType: string;
  } | null;
  driver: {
    id: number;
    name: string;
    mobile: string;
  } | null;
  route: {
    id: number;
    routeName: string;
    routeCode: string;
  } | null;
  gatePasses?: Array<{
    id: number;
    gatePassNo: string;
    status?: string | null;
  }>;
  tripRequests: Array<{
    loadingSequence?: number | null;
    request: {
      id: number;
      requestCode: string;
      plant?: { code: string } | null;
      fromLocation?: { locationName: string } | null;
      toLocation?: { locationName: string } | null;
      requiredKg?: number | string | null;
      requiredCbm?: number | string | null;
      boxCount?: number | null;
      invoiceNumbers?: string | null;
    };
  }>;
}

interface TripsRegistryProps {
  initialTrips: TripItem[];
}

export const TripsRegistry: React.FC<TripsRegistryProps> = ({ initialTrips }) => {
  const [trips] = useState<TripItem[]>(initialTrips);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const countAllocated = trips.filter((t) => ["ASSIGNED", "ALLOCATED"].includes(t.status)).length;
  const countDispatched = trips.filter((t) =>
    ["DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT", "RECONCILED"].includes(t.status)
  ).length;
  const countCompleted = trips.filter((t) =>
    ["COMPLETED", "FINALIZED", "CLOSED"].includes(t.status)
  ).length;

  const filterTabs = [
    { id: "ALL", label: "All Trips", count: trips.length },
    { id: "ALLOCATED", label: "Allocated", count: countAllocated },
    { id: "DISPATCHED", label: "Dispatched", count: countDispatched },
    { id: "COMPLETED", label: "Completed", count: countCompleted },
  ];

  const filteredTrips = trips.filter((t) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      t.tripNo.toLowerCase().includes(query) ||
      (t.vehicle?.vehicleNumber || "").toLowerCase().includes(query) ||
      (t.driver?.name || "").toLowerCase().includes(query) ||
      (t.route?.routeName || "").toLowerCase().includes(query) ||
      (t.gatePasses && t.gatePasses.some((gp) => gp.gatePassNo.toLowerCase().includes(query))) ||
      t.tripRequests.some((tr) => tr.request.requestCode.toLowerCase().includes(query));

    let matchesStatus = true;
    if (statusFilter === "ALL") {
      matchesStatus = true;
    } else if (statusFilter === "ALLOCATED") {
      matchesStatus = ["ASSIGNED", "ALLOCATED"].includes(t.status);
    } else if (statusFilter === "DISPATCHED") {
      matchesStatus = ["DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT", "RECONCILED"].includes(t.status);
    } else if (statusFilter === "COMPLETED") {
      matchesStatus = ["COMPLETED", "FINALIZED", "CLOSED"].includes(t.status);
    } else {
      matchesStatus = t.status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      {/* Slim Header (No bulky card, no subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pt-1">
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Delivery Trips Master Registry
          </h1>
        </div>

        <Link
          href="/allocations/fg/combine"
          className="h-8 inline-flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xs:inline">Combine Workbench</span>
          <span className="xs:hidden">Combine</span>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Total Trips
          </span>
          <p className="text-xl font-bold text-gray-900 tabular-nums mt-0.5">{trips.length}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
            Allocated / Planning
          </span>
          <p className="text-xl font-bold text-indigo-600 tabular-nums mt-0.5">{countAllocated}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
            Dispatched / On Road
          </span>
          <p className="text-xl font-bold text-blue-600 tabular-nums mt-0.5">{countDispatched}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
            Completed Trips
          </span>
          <p className="text-xl font-bold text-emerald-600 tabular-nums mt-0.5">{countCompleted}</p>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trip no, vehicle, driver, gate pass..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-9 pr-3 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:border-indigo-600 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`h-8 px-2.5 sm:px-3 rounded-lg text-xs font-semibold transition-colors shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                  statusFilter === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Trips Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Trip Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Route Corridor</th>
                <th className="py-3 px-4 text-center">Requests</th>
                <th className="py-3 px-4 text-right">Distance</th>
                <th className="py-3 px-4 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No trips match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => {
                  const totalBoxes = t.tripRequests.reduce(
                    (sum, tr) => sum + (Number(tr.request.boxCount) || 0),
                    0
                  );

                  return (
                    <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg tracking-tight inline-block">
                          {t.tripNo}
                        </span>
                        <span className="block text-[11px] text-gray-400 mt-1 tabular-nums">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                        {t.gatePasses && t.gatePasses.length > 0 && (
                          <div className="relative group inline-block mt-1.5">
                            <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
                              {t.gatePasses.slice(0, 2).map((gp) => (
                                <span
                                  key={gp.id}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums"
                                  title="Issued Security Gate Pass"
                                >
                                  GP: {gp.gatePassNo}
                                </span>
                              ))}
                              {t.gatePasses.length > 2 && (
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums bg-indigo-50 text-indigo-700 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors"
                                  title="Hover to view all gate passes"
                                >
                                  +{t.gatePasses.length - 2} more
                                </span>
                              )}
                            </div>

                            {/* Floating Hover Popover for all Gate Passes */}
                            {t.gatePasses.length > 2 && (
                              <div className="hidden group-hover:block absolute left-0 top-full mt-1.5 z-50 w-60 p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-800 text-xs transition-all animate-in fade-in duration-150">
                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-100 dark:border-slate-800">
                                  <span className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[10px]">
                                    Issued Gate Passes
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums">
                                    {t.gatePasses.length} total
                                  </span>
                                </div>
                                <div className="max-h-44 overflow-y-auto space-y-1 pr-1">
                                  {t.gatePasses.map((gp, idx) => (
                                    <div
                                      key={gp.id || idx}
                                      className="flex items-center justify-between p-1 rounded bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-700 text-[11px]"
                                    >
                                      <span className="font-bold text-gray-800 dark:text-gray-200 tabular-nums">
                                        {gp.gatePassNo}
                                      </span>
                                      <span className="text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
                                        Issued
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <StatusBadge status={t.status} />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900 tracking-tight">
                          <Truck className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t.vehicle?.vehicleNumber || "Unassigned"}</span>
                        </div>
                        <span className="text-[10px] text-gray-500">
                          {t.vehicle?.vehicleType || "General"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span>{t.driver?.name || "Unassigned"}</span>
                        </div>
                        <span className="text-[11px] text-gray-500 tabular-nums">
                          {t.driver?.mobile || "-"}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <span className="truncate font-medium text-gray-800 block">
                          {t.route?.routeName || "Consolidated Multi-Stop Corridor"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 tabular-nums">
                          {t.tripRequests.length} cargo
                        </span>
                        {totalBoxes > 0 && (
                          <span className="block text-[10px] text-gray-400 mt-0.5 tabular-nums">
                            {totalBoxes} boxes
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
                        {formatNumber(Number(t.actualKm || t.plannedKm) || 0, 1)} KM
                        {t.actualKm && (
                          <span className="block text-[10px] font-normal text-emerald-600">
                            Actual verified
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Stage-Aware Workflow Navigation */}
                          {["ASSIGNED", "ALLOCATED"].includes(t.status) && (
                            <Link
                              href="/allocations/fg/combine"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                              title="Go to Combine Workbench"
                            >
                              <Layers className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Workbench</span>
                            </Link>
                          )}

                          {["COMPLETED", "RECONCILED", "DISPATCHED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "IN_TRANSIT"].includes(t.status) && (
                            <Link
                              href="/reconciliation"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
                              title="Verify & Reconcile with Datatex ERP"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              <span>Reconcile</span>
                            </Link>
                          )}

                          {["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(t.status) && (
                            <Link
                              href="/pod"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                              title="Track Commercial Invoices in POD Hub"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>POD</span>
                            </Link>
                          )}

                          {/* Manifest Detail View */}
                          <Link
                            href={`/trips/${t.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 transition-colors"
                            title="View Trip Manifest"
                          >
                            <span>Manifest</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
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
};
