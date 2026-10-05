"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  Truck,
  Building2,
  Calendar,
  Fuel,
  TrendingUp,
  Search,
  Download,
  Gauge,
  Package,
  Layers,
  MapPin,
  Eye,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { CostCalculator } from "@/lib/cost-calculator";

export interface CostOperationReportsClientProps {
  operationType: "FIXED" | "KM_BASED" | "ADHOC";
  title: string;
  description: string;
  initialTrips: any[];
  initialRequests: any[];
  initialVehicles: any[];
  initialPlants: any[];
  dieselRate: number;
  currentMonth: string;
}

function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    "data:text/csv;charset=utf-8," +
    [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function CostOperationReportsClient({
  operationType,
  title,
  description,
  initialTrips = [],
  initialRequests = [],
  initialVehicles = [],
  initialPlants = [],
  dieselRate = 382.0,
  currentMonth = "2026-10",
}: CostOperationReportsClientProps) {
  const [activeSubTab, setActiveSubTab] = useState<"trips" | "cost_share" | "statements" | "plants">("trips");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. FILTER VEHICLES BELONGING TO THIS OPERATION TYPE
  const operationVehicles = useMemo(() => {
    return initialVehicles.filter((v) => {
      if (operationType === "FIXED") {
        return v.paymentBasis === "FIXED" || Number(v.monthlyFixedRate || 0) > 0;
      }
      if (operationType === "ADHOC") {
        return v.ownershipType === "ADHOC" || v.paymentBasis === "ADHOC";
      }
      // KM_BASED: Commercial vehicles that are not FIXED and not ADHOC
      return (
        v.paymentBasis !== "FIXED" &&
        v.paymentBasis !== "ADHOC" &&
        v.ownershipType !== "ADHOC" &&
        Number(v.monthlyFixedRate || 0) === 0
      );
    });
  }, [initialVehicles, operationType]);

  const vehicleIdSet = useMemo(() => {
    return new Set(operationVehicles.map((v) => v.id));
  }, [operationVehicles]);

  // 2. FILTER TRIPS MATCHING THIS OPERATION AND SELECTED MONTH
  const monthTrips = useMemo(() => {
    return initialTrips.filter((t) => {
      // Allow trips that are COMPLETED, RECONCILED, FINALIZED, or CLOSED (or currently in transit)
      const dateStr = t.createdAt || t.startDate || "";
      const tripMonth = String(dateStr).substring(0, 7);
      if (selectedMonth && tripMonth !== selectedMonth) return false;

      // Check vehicle linkage or trip-level paymentBasis
      const v = t.vehicle || {};
      const isVehicleMatched = v.id ? vehicleIdSet.has(v.id) : false;

      if (operationType === "FIXED") {
        return isVehicleMatched || t.paymentBasis === "FIXED" || v.paymentBasis === "FIXED";
      }
      if (operationType === "ADHOC") {
        return (
          isVehicleMatched ||
          t.paymentBasis === "ADHOC" ||
          v.paymentBasis === "ADHOC" ||
          v.ownershipType === "ADHOC" ||
          t.transporterName
        );
      }
      // KM_BASED
      if (v.paymentBasis === "FIXED" || v.ownershipType === "ADHOC" || t.paymentBasis === "ADHOC") {
        return false;
      }
      return isVehicleMatched || t.paymentBasis === "KM_BASED" || v.paymentBasis === "KM_BASED";
    });
  }, [initialTrips, selectedMonth, vehicleIdSet, operationType]);

  // Calculate day counts per vehicle for fixed proration
  const vehicleDayTripCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    monthTrips.forEach((t) => {
      const vId = String(t.vehicleId || t.vehicle?.id || "unknown");
      const tripDate = String(t.createdAt || "").substring(0, 10);
      if (!counts[vId]) counts[vId] = {};
      counts[vId][tripDate] = (counts[vId][tripDate] || 0) + 1;
    });
    return counts;
  }, [monthTrips]);

  // Process Detailed Trip Costs
  const processedTripCosts = useMemo(() => {
    return monthTrips.map((t) => {
      const v = t.vehicle || {};
      const vId = String(t.vehicleId || v.id || "unknown");
      const tripDate = String(t.createdAt || "").substring(0, 10);
      const km = Number(t.actualKm || t.plannedKm || 0);

      const dayTripsCount = vehicleDayTripCounts[vId]?.[tripDate] || 1;
      const workingDaysShare = dayTripsCount > 0 ? 1.0 / dayTripsCount : 1.0;

      const isAdhoc = operationType === "ADHOC" || v.ownershipType === "ADHOC" || t.paymentBasis === "ADHOC";

      const costComp = isAdhoc
        ? {
            km,
            diesel_rate: 0,
            fuel_consumption: 0,
            fuel_cost_per_km: 0,
            running_cost_per_km: 0,
            profit_per_km: 0,
            per_km_rate: 0,
            fuel_cost: 0,
            running_cost: 0,
            driver_profit: 0,
            fixed_daily_cost: 0,
            total_trip_cost: Number(t.totalTripCost ?? t.actualCost ?? t.estimatedCost ?? 0),
          }
        : CostCalculator.calculateTripCost(km, v, dieselRate, workingDaysShare);

      // Process linked cargo requests
      const linkedReqs = (t.tripRequests || []).map((tr: any) => {
        const r = tr.request || {};
        return {
          id: r.id || tr.requestId,
          requestCode: r.requestCode || `REQ-${r.id}`,
          requiredCbm: Number(r.requiredCbm || r.volumeCbm || 0),
          requiredKg: Number(r.requiredKg || r.weightKg || 0),
          itemDescription: r.itemDescription || "-",
          requiredDate: String(r.requiredDate || "").substring(0, 10),
          plantCode: r.plant?.code || r.plantCode || "Plant",
          fromName: r.fromLocation?.locationName || r.fromName || "-",
          toName: r.toLocation?.locationName || r.toName || "-",
        };
      });

      const reqShares = CostCalculator.allocateRequestCostShare(costComp.total_trip_cost, linkedReqs as any);
      const savings = isAdhoc
        ? {
            standalone_total_cost: costComp.total_trip_cost,
            actual_combined_cost: costComp.total_trip_cost,
            net_savings: 0,
            savings_pct: 0,
            is_consolidated: false,
            standalone_breakdown: [],
          }
        : CostCalculator.calculateConsolidationSavings(costComp.total_trip_cost, v, linkedReqs as any, dieselRate);

      return {
        ...t,
        vehicleNumber: v.vehicleNumber || t.transporterName || "Unassigned",
        vehicleCategory: v.vehicleCategory || v.vehicleType || "Standard Fleet",
        driverName: t.driver?.name || "Assigned Driver",
        driverMobile: t.driver?.mobile || "-",
        routeName: t.route?.routeName || "Consolidated Multi-Stop Route",
        calcKm: km,
        ...costComp,
        linkedRequests: linkedReqs,
        requestShares: reqShares,
        consolidationSavings: savings,
      };
    });
  }, [monthTrips, vehicleDayTripCounts, dieselRate, operationType]);

  // Flattened Request Cost Allocation List (Sub-Tab 2: Cost Share)
  const flattenedRequestCosts = useMemo(() => {
    const list: any[] = [];
    processedTripCosts.forEach((t) => {
      (t.linkedRequests || []).forEach((lr: any) => {
        const share = t.requestShares[lr.id] || { allocated_cost: 0, share_pct: 0 };
        list.push({
          requestId: lr.id,
          requestCode: lr.requestCode,
          plantCode: lr.plantCode,
          fromName: lr.fromName,
          toName: lr.toName,
          itemDescription: lr.itemDescription,
          cbm: lr.requiredCbm,
          kg: lr.requiredKg,
          requiredDate: lr.requiredDate,
          tripId: t.id,
          tripNo: t.tripNo || `TRIP-${t.id}`,
          vehicleNumber: t.vehicleNumber,
          vehicleCategory: t.vehicleCategory,
          tripKm: t.calcKm,
          tripTotalCost: t.total_trip_cost,
          sharePct: share.share_pct,
          allocatedCost: share.allocated_cost,
        });
      });
    });
    return list;
  }, [processedTripCosts]);

  // Vehicle / Transporter Settlements (Sub-Tab 3: Vehicle Statement)
  const vehicleStatements = useMemo(() => {
    if (operationType === "FIXED") {
      return operationVehicles.map((v) => {
        const vTrips = processedTripCosts.filter((t) => String(t.vehicleId || t.vehicle?.id) === String(v.id));
        const monthRunKm = vTrips.reduce((sum, t) => sum + Number(t.calcKm || 0), 0);
        const settle = CostCalculator.calculateFixedFleetSettlement(v, monthRunKm);
        return {
          id: v.id,
          identifier: v.vehicleNumber,
          category: v.vehicleCategory || v.vehicleType || "Fixed Truck",
          tripsCount: vTrips.length,
          baseRent: settle.base_rent,
          kmLimit: settle.km_limit,
          actualRunKm: settle.actual_km,
          extraKm: settle.extra_km,
          extraKmRate: settle.extra_km_rate,
          extraCharge: settle.extra_charge,
          totalPayout: settle.total_payout,
          trips: vTrips,
        };
      });
    }

    if (operationType === "ADHOC") {
      // Group by Transporter or Vehicle Number
      const transporterMap: Record<string, { transporter: string; tripsCount: number; totalCost: number; totalKm: number; totalCbm: number; totalKg: number }> = {};
      processedTripCosts.forEach((t) => {
        const name = t.transporterName || t.vehicle?.transporterName || t.vehicleNumber || "Ad-Hoc Vendor";
        if (!transporterMap[name]) {
          transporterMap[name] = { transporter: name, tripsCount: 0, totalCost: 0, totalKm: 0, totalCbm: 0, totalKg: 0 };
        }
        transporterMap[name].tripsCount += 1;
        transporterMap[name].totalCost += t.total_trip_cost;
        transporterMap[name].totalKm += t.calcKm;
        t.linkedRequests.forEach((lr: any) => {
          transporterMap[name].totalCbm += lr.requiredCbm;
          transporterMap[name].totalKg += lr.requiredKg;
        });
      });
      return Object.values(transporterMap);
    }

    // KM_BASED Operations
    return operationVehicles.map((v) => {
      const vTrips = processedTripCosts.filter((t) => String(t.vehicleId || t.vehicle?.id) === String(v.id));
      const totalKm = vTrips.reduce((sum, t) => sum + Number(t.calcKm || 0), 0);
      const totalFuelCost = vTrips.reduce((sum, t) => sum + Number(t.fuel_cost || 0), 0);
      const totalRunningCost = vTrips.reduce((sum, t) => sum + Number(t.running_cost || 0), 0);
      const totalDriverProfit = vTrips.reduce((sum, t) => sum + Number(t.driver_profit || 0), 0);
      const totalCost = vTrips.reduce((sum, t) => sum + Number(t.total_trip_cost || 0), 0);

      return {
        id: v.id,
        identifier: v.vehicleNumber,
        category: v.vehicleCategory || v.vehicleType || "Commercial KM Fleet",
        tripsCount: vTrips.length,
        totalKm,
        totalFuelCost,
        totalRunningCost,
        totalDriverProfit,
        totalPayout: totalCost,
        effectiveRatePerKm: totalKm > 0 ? totalCost / totalKm : 0,
        trips: vTrips,
      };
    });
  }, [operationVehicles, processedTripCosts, operationType]);

  // Plant Cost Allocation (Sub-Tab 4: Plant Allocation)
  const plantAllocations = useMemo(() => {
    const plantMap: Record<string, { code: string; name: string; tripsCount: Set<number>; totalCost: number; totalCbm: number; totalKg: number; requestCount: number }> = {};
    
    // Initialize with master plants
    initialPlants.forEach((p) => {
      plantMap[p.code] = {
        code: p.code,
        name: p.name || p.code,
        tripsCount: new Set(),
        totalCost: 0,
        totalCbm: 0,
        totalKg: 0,
        requestCount: 0,
      };
    });

    flattenedRequestCosts.forEach((rc) => {
      const code = rc.plantCode || "OTHER";
      if (!plantMap[code]) {
        plantMap[code] = {
          code,
          name: code,
          tripsCount: new Set(),
          totalCost: 0,
          totalCbm: 0,
          totalKg: 0,
          requestCount: 0,
        };
      }
      plantMap[code].tripsCount.add(rc.tripId);
      plantMap[code].totalCost += rc.allocatedCost;
      plantMap[code].totalCbm += rc.cbm;
      plantMap[code].totalKg += rc.kg;
      plantMap[code].requestCount += 1;
    });

    return Object.values(plantMap).map((p) => ({
      code: p.code,
      name: p.name,
      tripsCount: p.tripsCount.size,
      requestCount: p.requestCount,
      totalCost: p.totalCost,
      totalCbm: p.totalCbm,
      totalKg: p.totalKg,
      costPerCbm: p.totalCbm > 0 ? p.totalCost / p.totalCbm : 0,
      costPerKg: p.totalKg > 0 ? p.totalCost / p.totalKg : 0,
    })).filter((p) => p.tripsCount > 0 || p.requestCount > 0 || initialPlants.some((ip) => ip.code === p.code));
  }, [flattenedRequestCosts, initialPlants]);

  // Filtered lists by Search Query
  const filteredTripCosts = useMemo(() => {
    if (!searchQuery.trim()) return processedTripCosts;
    const q = searchQuery.toLowerCase();
    return processedTripCosts.filter(
      (t) =>
        (t.tripNo || "").toLowerCase().includes(q) ||
        (t.vehicleNumber || "").toLowerCase().includes(q) ||
        (t.driverName || "").toLowerCase().includes(q) ||
        (t.routeName || "").toLowerCase().includes(q)
    );
  }, [processedTripCosts, searchQuery]);

  const filteredRequestCosts = useMemo(() => {
    if (!searchQuery.trim()) return flattenedRequestCosts;
    const q = searchQuery.toLowerCase();
    return flattenedRequestCosts.filter(
      (rc) =>
        (rc.requestCode || "").toLowerCase().includes(q) ||
        (rc.tripNo || "").toLowerCase().includes(q) ||
        (rc.vehicleNumber || "").toLowerCase().includes(q) ||
        (rc.plantCode || "").toLowerCase().includes(q)
    );
  }, [flattenedRequestCosts, searchQuery]);

  // KPI Calculations
  const kpiTotalSpend = useMemo(() => {
    if (operationType === "FIXED") {
      return (vehicleStatements as any[]).reduce((sum, v) => sum + Number(v.totalPayout || 0), 0);
    }
    return processedTripCosts.reduce((sum, t) => sum + Number(t.total_trip_cost || 0), 0);
  }, [processedTripCosts, vehicleStatements, operationType]);

  const kpiTotalKm = useMemo(() => {
    return processedTripCosts.reduce((sum, t) => sum + Number(t.calcKm || 0), 0);
  }, [processedTripCosts]);

  const kpiTotalTrips = processedTripCosts.length;
  const kpiAvgCostPerTrip = kpiTotalTrips > 0 ? kpiTotalSpend / kpiTotalTrips : 0;
  const kpiAvgCostPerKm = kpiTotalKm > 0 ? kpiTotalSpend / kpiTotalKm : 0;

  // CSV Export Handler
  const handleExport = () => {
    const filename = `${operationType.toLowerCase()}_${activeSubTab}_${selectedMonth}`;
    if (activeSubTab === "trips") {
      const headers = [
        "Trip No",
        "Date",
        "Vehicle",
        "Category",
        "Driver",
        "Route",
        "Actual KM",
        "Fuel Cost (Rs.)",
        "Running Cost (Rs.)",
        "Driver Profit (Rs.)",
        "Daily Fixed (Rs.)",
        "Total Cost (Rs.)",
        "Consolidation Savings (Rs.)",
      ];
      const rows = filteredTripCosts.map((t) => [
        t.tripNo || `TRIP-${t.id}`,
        (t.createdAt || "").substring(0, 10),
        t.vehicleNumber,
        t.vehicleCategory,
        t.driverName,
        t.routeName,
        t.calcKm.toFixed(1),
        t.fuel_cost.toFixed(2),
        t.running_cost.toFixed(2),
        t.driver_profit.toFixed(2),
        t.fixed_daily_cost.toFixed(2),
        t.total_trip_cost.toFixed(2),
        t.consolidationSavings?.net_savings?.toFixed(2) || "0.00",
      ]);
      exportToCsv(filename, headers, rows);
    } else if (activeSubTab === "cost_share") {
      const headers = [
        "Request Code",
        "Required Date",
        "Plant",
        "From",
        "To",
        "Description",
        "Volume (CBM)",
        "Weight (KG)",
        "Trip No",
        "Vehicle",
        "Share %",
        "Allocated Cost (Rs.)",
      ];
      const rows = filteredRequestCosts.map((rc) => [
        rc.requestCode,
        rc.requiredDate,
        rc.plantCode,
        rc.fromName,
        rc.toName,
        rc.itemDescription,
        rc.cbm.toFixed(2),
        rc.kg.toFixed(0),
        rc.tripNo,
        rc.vehicleNumber,
        rc.sharePct + "%",
        rc.allocatedCost.toFixed(2),
      ]);
      exportToCsv(filename, headers, rows);
    } else if (activeSubTab === "statements") {
      if (operationType === "FIXED") {
        const headers = [
          "Vehicle Number",
          "Category",
          "Trips",
          "Base Rent (Rs.)",
          "KM Limit",
          "Actual Run KM",
          "Extra KM",
          "Extra Rate (Rs.)",
          "Extra Charge (Rs.)",
          "Total Payout (Rs.)",
        ];
        const rows = (vehicleStatements as any[]).map((v) => [
          v.identifier,
          v.category,
          v.tripsCount,
          v.baseRent.toFixed(2),
          v.kmLimit,
          v.actualRunKm.toFixed(1),
          v.extraKm.toFixed(1),
          v.extraKmRate.toFixed(2),
          v.extraCharge.toFixed(2),
          v.totalPayout.toFixed(2),
        ]);
        exportToCsv(filename, headers, rows);
      } else if (operationType === "ADHOC") {
        const headers = ["Transporter / Vehicle", "Trips Count", "Run KM", "Total Volume (CBM)", "Total Weight (KG)", "Total Payout (Rs.)"];
        const rows = (vehicleStatements as any[]).map((v) => [
          v.transporter,
          v.tripsCount,
          v.totalKm.toFixed(1),
          v.totalCbm.toFixed(2),
          v.totalKg.toFixed(0),
          v.totalCost.toFixed(2),
        ]);
        exportToCsv(filename, headers, rows);
      } else {
        const headers = ["Vehicle Number", "Category", "Trips", "Run KM", "Fuel Cost (Rs.)", "Running Cost (Rs.)", "Driver Profit (Rs.)", "Total Payable (Rs.)", "Cost/KM (Rs.)"];
        const rows = (vehicleStatements as any[]).map((v) => [
          v.identifier,
          v.category,
          v.tripsCount,
          v.totalKm.toFixed(1),
          v.totalFuelCost.toFixed(2),
          v.totalRunningCost.toFixed(2),
          v.totalDriverProfit.toFixed(2),
          v.totalPayout.toFixed(2),
          v.effectiveRatePerKm.toFixed(2),
        ]);
        exportToCsv(filename, headers, rows);
      }
    } else if (activeSubTab === "plants") {
      const headers = ["Plant Code", "Plant Name", "Trips Count", "Requests", "CBM Moved", "KG Moved", "Allocated Cost (Rs.)", "Cost / CBM (Rs.)", "Cost / KG (Rs.)"];
      const rows = plantAllocations.map((p) => [
        p.code,
        p.name,
        p.tripsCount,
        p.requestCount,
        p.totalCbm.toFixed(2),
        p.totalKg.toFixed(0),
        p.totalCost.toFixed(2),
        p.costPerCbm.toFixed(2),
        p.costPerKg.toFixed(2),
      ]);
      exportToCsv(filename, headers, rows);
    }
  };

  const getBadgeStyle = () => {
    if (operationType === "FIXED") return "bg-purple-50 text-purple-700 border-purple-200";
    if (operationType === "KM_BASED") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  return (
    <div className="w-full space-y-3 p-2 sm:p-4">
      {/* 1. TOP HEADER & TOOLBAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
            {operationType === "FIXED" ? (
              <Building2 className="w-5 h-5" />
            ) : operationType === "KM_BASED" ? (
              <Gauge className="w-5 h-5" />
            ) : (
              <Truck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-800">{title}</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getBadgeStyle()}`}>
                {operationType.replace("_", " ")}
              </span>
            </div>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-semibold bg-transparent text-slate-700 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Download CSV for currently viewed tab"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Total Period Spend</span>
          <span className="text-lg font-bold text-slate-900 block mt-0.5">{formatCurrency(kpiTotalSpend)}</span>
          <span className="text-[10px] text-slate-500 font-medium">All approved expenses</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Operational Trips</span>
          <span className="text-lg font-bold text-indigo-700 block mt-0.5">{kpiTotalTrips} Trips</span>
          <span className="text-[10px] text-slate-500 font-medium">{formatNumber(kpiTotalKm, 1)} Total KM</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Average Cost / Trip</span>
          <span className="text-lg font-bold text-emerald-700 block mt-0.5">{formatCurrency(kpiAvgCostPerTrip)}</span>
          <span className="text-[10px] text-slate-500 font-medium">Per dispatch cycle</span>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-400 block uppercase">Average Cost / KM</span>
          <span className="text-lg font-bold text-blue-700 block mt-0.5">Rs. {formatNumber(kpiAvgCostPerKm, 2)}</span>
          <span className="text-[10px] text-slate-500 font-medium">Fleet efficiency rate</span>
        </div>
      </div>

      {/* 3. FOUR SUB-PAGES / TABS BAR */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab("trips")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === "trips"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>1. Trip Costs</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {processedTripCosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("cost_share")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === "cost_share"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Cost Share</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {flattenedRequestCosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("statements")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === "statements"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>3. Vehicle Statement</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {(vehicleStatements as any[]).length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("plants")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === "plants"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>4. Plant Allocation</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {plantAllocations.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trip, vehicle, request..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* 4. SUB-TAB TABLES CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* ======================================================== */}
        {/* SUB-TAB 1: TRIP COSTS TABLE */}
        {/* ======================================================== */}
        {activeSubTab === "trips" && (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Trip Number</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vehicle</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Driver</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Route Corridor</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Actual KM</th>
                  {operationType !== "ADHOC" && (
                    <>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Fuel (Rs.)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Running (Rs.)</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Profit (Rs.)</th>
                      {operationType === "FIXED" && (
                        <th className="py-2.5 px-3 text-right whitespace-nowrap">Day Fixed (Rs.)</th>
                      )}
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Cost</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap pr-4">Consolidation Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTripCosts.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-8 text-center text-slate-400 font-medium">
                      No operational trips recorded for {selectedMonth} under {operationType.replace("_", " ")}.
                    </td>
                  </tr>
                ) : (
                  filteredTripCosts.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <Link
                          href={`/trips/${t.id}`}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 group shadow-2xs"
                        >
                          <span>{t.tripNo || `TRIP-${t.id}`}</span>
                          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {(t.createdAt || "").substring(0, 10)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        {t.vehicleNumber}
                        <span className="text-[10px] font-normal text-slate-400 block">{t.vehicleCategory}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        {t.driverName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium truncate max-w-[240px]" title={t.routeName}>
                        {t.routeName}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatNumber(t.calcKm, 1)} KM
                      </td>
                      {operationType !== "ADHOC" && (
                        <>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatNumber(t.fuel_cost, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatNumber(t.running_cost, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatNumber(t.driver_profit, 2)}
                          </td>
                          {operationType === "FIXED" && (
                            <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                              {formatNumber(t.fixed_daily_cost, 2)}
                            </td>
                          )}
                        </>
                      )}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        {formatCurrency(t.total_trip_cost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700 whitespace-nowrap pr-4">
                        {t.consolidationSavings?.net_savings > 0 ? (
                          <span className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            +{formatCurrency(t.consolidationSavings.net_savings)}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 2: COST SHARE (REQUEST-WISE) TABLE */}
        {/* ======================================================== */}
        {activeSubTab === "cost_share" && (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Request ID</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Plant</th>
                  <th className="py-2.5 px-3 min-w-[180px]">From ➔ To</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Cargo Volume</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Weight (KG)</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Trip Number</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Vehicle</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Trip Total (Rs.)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Share %</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap pr-4">Allocated Cost (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequestCosts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      No linked request cost shares found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  filteredRequestCosts.map((rc, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <Link
                          href={`/requests/${rc.requestId}`}
                          className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 group shadow-2xs"
                        >
                          <span>{rc.requestCode}</span>
                          <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {rc.plantCode}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium truncate max-w-[200px]" title={`${rc.fromName} -> ${rc.toName}`}>
                        {rc.fromName} ➔ {rc.toName}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-semibold whitespace-nowrap">
                        {formatNumber(rc.cbm, 2)} CBM
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-800 font-semibold whitespace-nowrap">
                        {formatNumber(rc.kg, 0)} KG
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                        {rc.tripNo}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700">
                        {rc.vehicleNumber}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                        {formatCurrency(rc.tripTotalCost)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                        {rc.sharePct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap pr-4">
                        {formatCurrency(rc.allocatedCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 3: VEHICLE / TRANSPORTER STATEMENT */}
        {/* ======================================================== */}
        {activeSubTab === "statements" && (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">
                    {operationType === "ADHOC" ? "Transporter / Vendor" : "Vehicle Number"}
                  </th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Category / Type</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Trips Done</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Run KM</th>
                  {operationType === "FIXED" && (
                    <>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Monthly Rent</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">KM Limit</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Extra KM</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Extra KM Rate</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Extra Charge</th>
                    </>
                  )}
                  {operationType === "KM_BASED" && (
                    <>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Fuel Index</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Running Cost</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Driver Profit</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Cost / KM</th>
                    </>
                  )}
                  {operationType === "ADHOC" && (
                    <>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Total CBM Moved</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Total KG Moved</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-right whitespace-nowrap pr-4">Total Payout (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(vehicleStatements as any[]).length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      No vehicle settlement records found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  (vehicleStatements as any[]).map((v, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {v.identifier || v.transporter}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {v.category || "On-Demand"}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-indigo-700 whitespace-nowrap">
                        {v.tripsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                        {formatNumber(v.actualRunKm || v.totalKm || 0, 1)} KM
                      </td>
                      {operationType === "FIXED" && (
                        <>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatCurrency(v.baseRent)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatNumber(v.kmLimit, 0)} KM
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            {v.extraKm > 0 ? (
                              <span className="font-bold text-rose-600">+{formatNumber(v.extraKm, 1)} KM</span>
                            ) : (
                              <span className="text-emerald-600 font-semibold">Within limit</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            Rs. {formatNumber(v.extraKmRate, 2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatCurrency(v.extraCharge)}
                          </td>
                        </>
                      )}
                      {operationType === "KM_BASED" && (
                        <>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatCurrency(v.totalFuelCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatCurrency(v.totalRunningCost)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">
                            {formatCurrency(v.totalDriverProfit)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-indigo-700 whitespace-nowrap">
                            Rs. {formatNumber(v.effectiveRatePerKm, 2)}
                          </td>
                        </>
                      )}
                      {operationType === "ADHOC" && (
                        <>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatNumber(v.totalCbm, 2)} CBM
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatNumber(v.totalKg, 0)} KG
                          </td>
                        </>
                      )}
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-800 whitespace-nowrap pr-4">
                        {formatCurrency(v.totalPayout || v.totalCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-TAB 4: PLANT ALLOCATION TABLE */}
        {/* ======================================================== */}
        {activeSubTab === "plants" && (
          <div className="overflow-x-auto max-h-[calc(100vh-320px)] min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Plant Code</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Plant Name</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Trips Count</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Requests</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Volume Moved (CBM)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Weight Moved (KG)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Cost / CBM</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Cost / KG</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap pr-4">Total Plant Spend (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plantAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      No plant cost allocations found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  plantAllocations.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-indigo-700 whitespace-nowrap">
                        {p.code}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                        {p.tripsCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                        {p.requestCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatNumber(p.totalCbm, 2)} CBM
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatNumber(p.totalKg, 0)} KG
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                        Rs. {formatNumber(p.costPerCbm, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-indigo-700 whitespace-nowrap">
                        Rs. {formatNumber(p.costPerKg, 2)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap pr-4">
                        {formatCurrency(p.totalCost)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
