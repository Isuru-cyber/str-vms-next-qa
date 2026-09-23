import React from "react";
import Link from "next/link";
import {
  FileText,
  Truck,
  TrendingUp,
  MapPin,
  PlusCircle,
  Combine,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  BarChart3,
  Building2,
  Layers,
  Package,
  ArrowRight,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CostCalculator } from "@/lib/cost-calculator";
import { TrendPerformanceChart, FleetUtilDoughnutChart } from "@/components/dashboard/DashboardCharts";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const tripWhere: any = {};
  const requestWhere: any = {};
  const vehicleWhere: any = { active: 1 };

  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    tripWhere.tripRequests = {
      some: {
        request: {
          plantId: { in: user.plantIds },
        },
      },
    };
    requestWhere.plantId = { in: user.plantIds };
    vehicleWhere.OR = [
      { defaultLocation: { plantId: { in: user.plantIds } } },
      { drivers: { some: { linkedPlantId: { in: user.plantIds } } } }
    ];
  } else if (!isAdmin(user) && (!user.plantIds || user.plantIds.length === 0)) {
    tripWhere.id = -1;
    requestWhere.id = -1;
    vehicleWhere.id = -1;
  }

  const now = new Date();
  const currentMonthLabel = now.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Metrics & Data Variables
  let dieselRate = 382.0;
  let totalVehicles = 0;
  let availableVehicles = 0;
  let allocatedVehicles = 0;
  let pendingRequestsCount = 0;
  let consolidationOpportunities = 0;

  let monthTotalKm = 0;
  let totalKmCost = 0;
  let totalFuelCost = 0;
  let totalConsolidationSavings = 0;
  let totalStandaloneCost = 0;
  let completedTripsCount = 0;

  let highlyUtilised = 0; // >3 trips
  let underUtilised = 0; // 1-3 trips
  let unusedVehicles = 0; // 0 trips

  let highestDemandPlants: Array<{ plantName: string; reqCount: number; totalCbm: number }> = [];
  let recentTrips: any[] = [];

  // 7-day trend data structure
  const trendDays: Array<{ dateStr: string; dayLabel: string; count: number; km: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit" });
    trendDays.push({ dateStr, dayLabel, count: 0, km: 0 });
  }

  try {
    const [
      fuelRateRecord,
      allVehicles,
      pendingCount,
      oppGroups,
      monthTrips,
      pastSevenDaysTrips,
      topPlantsRaw,
      recentDispatched,
      allPlantsInfo,
    ] = await Promise.all([
      // Diesel Rate: try current month first, then latest
      prisma.monthlyFuelRate.findFirst({
        where: { periodMonth: currentMonthStr },
        orderBy: { periodMonth: "desc" },
      }).then(r => r || prisma.monthlyFuelRate.findFirst({ orderBy: { periodMonth: "desc" } })),
      // Total Vehicles scoped
      prisma.vehicle.findMany({
        where: vehicleWhere,
        select: { id: true, status: true, vehicleNumber: true, vehicleType: true },
      }),
      // Pending Demands scoped
      prisma.vehicleRequest.count({
        where: { ...requestWhere, status: { in: ["SUBMITTED", "UNDER REVIEW"] } },
      }),
      // Consolidation Opps scoped
      prisma.vehicleRequest.groupBy({
        by: ["requiredDate", "fromLocationId"],
        where: { ...requestWhere, status: "SUBMITTED" },
        _count: { id: true },
        having: { id: { _count: { gt: 1 } } },
      }),
      // This Month Trips with Linked Requests for Costing & Savings (scoped + take: 500)
      prisma.deliveryTrip.findMany({
        where: {
          ...tripWhere,
          status: { not: "CANCELLED" },
          createdAt: { gte: startOfMonth },
        },
        take: 500,
        include: {
          vehicle: true,
          driver: true,
          route: true,
          tripRequests: {
            include: {
              request: {
                include: {
                  fromLocation: true,
                  toLocation: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // 7-Day Performance Trend (scoped + take: 500)
      prisma.deliveryTrip.findMany({
        where: {
          ...tripWhere,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          status: { not: "CANCELLED" },
        },
        take: 500,
        select: {
          createdAt: true,
          plannedKm: true,
          actualKm: true,
        },
      }),
      // Top Plant Demand (scoped)
      prisma.vehicleRequest.groupBy({
        by: ["plantId"],
        where: requestWhere,
        _count: { id: true },
        _sum: { requiredCbm: true },
        orderBy: {
          _count: { id: "desc" },
        },
        take: 5,
      }),
      // Recent Dispatched Trips (scoped)
      prisma.deliveryTrip.findMany({
        where: tripWhere,
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: true,
          driver: true,
          route: true,
          _count: { select: { tripRequests: true } },
        },
      }),
      // Plants Info (colocated for top plants metrics)
      prisma.plant.findMany({
        select: { id: true, code: true, name: true },
      }),
    ]);

    if (fuelRateRecord) {
      dieselRate = Number(fuelRateRecord.dieselRate);
    }

    // Fleet KPIs
    totalVehicles = allVehicles.length;
    availableVehicles = allVehicles.filter((v: any) => v.status === "AVAILABLE").length;
    allocatedVehicles = allVehicles.filter(
      (v: any) => v.status === "ALLOCATED" || v.status === "IN_USE" || v.status === "IN_TRIP"
    ).length;
    pendingRequestsCount = pendingCount;
    consolidationOpportunities = oppGroups.length;
    recentTrips = recentDispatched;

    // Month Costing & Consolidation Net Savings
    const tripCountsByVehicle: Record<number, number> = {};
    for (const t of monthTrips as any[]) {
      if (t.vehicleId) {
        tripCountsByVehicle[t.vehicleId] = (tripCountsByVehicle[t.vehicleId] || 0) + 1;
      }
      if (["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(t.status)) {
        completedTripsCount++;
      }
      const km = Number(t.actualKm) > 0 ? Number(t.actualKm) : Number(t.plannedKm) || 0;
      monthTotalKm += km;

      const costBreakdown = CostCalculator.calculateTripCost(
        km,
        t.vehicle || {},
        dieselRate,
        1
      );

      const linkedReqs = (t.tripRequests || [])
        .filter((tr: any) => tr.request)
        .map((tr: any) => ({
          id: tr.request.id,
          requestCode: tr.request.requestCode,
          plannedDistanceKm: Number(tr.request.plannedDistanceKm) || 50,
          from_name: tr.request.fromLocation?.locationName || "",
          to_name: tr.request.toLocation?.locationName || "",
        }));

      const savings = CostCalculator.calculateConsolidationSavings(
        costBreakdown.total_trip_cost,
        t.vehicle || {},
        linkedReqs,
        dieselRate
      );

      totalKmCost += costBreakdown.total_trip_cost;
      totalFuelCost += costBreakdown.fuel_cost;
      totalConsolidationSavings += savings.net_savings;
      totalStandaloneCost += savings.standalone_total_cost;
    }

    // Vehicle Utilisation Counts
    for (const v of allVehicles as any[]) {
      const c = tripCountsByVehicle[v.id] || 0;
      if (c > 3) highlyUtilised++;
      else if (c >= 1) underUtilised++;
      else unusedVehicles++;
    }

    // 7-day trend population
    pastSevenDaysTrips.forEach((t: any) => {
      const tripDateStr = t.createdAt.toISOString().split("T")[0];
      const match = trendDays.find((td) => td.dateStr === tripDateStr);
      if (match) {
        match.count += 1;
        const km = Number(t.actualKm) > 0 ? Number(t.actualKm) : Number(t.plannedKm) || 0;
        match.km += km;
      }
    });

    // Highest Demand Plants Details (using colocated allPlantsInfo)
    highestDemandPlants = (topPlantsRaw as any[]).map((p: any) => {
      const pl = (allPlantsInfo as any[]).find((pi: any) => pi.id === p.plantId);
      return {
        plantName: pl?.code || pl?.name || `Plant ${p.plantId}`,
        reqCount: p._count.id,
        totalCbm: Number(p._sum.requiredCbm || 0),
      };
    });
  } catch (err) {
    console.error("Dashboard metrics calculation error:", err);
  }

  const totalMonthCost = totalKmCost;
  const savingsPct =
    totalStandaloneCost > 0
      ? Math.round((totalConsolidationSavings / totalStandaloneCost) * 100)
      : 0;
  const maxTrendCount = Math.max(...trendDays.map((d) => d.count), 1);
  const maxPlantReqs = Math.max(...highestDemandPlants.map((p) => p.reqCount), 1);

  return (
    <div className="space-y-5">
      {/* Top KPI Overview (4 Cards matching PHP layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Active Fleet */}
        <div className="bg-white rounded-xl shadow-xs p-5 border border-slate-200 flex items-center justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              Total Fleet
            </p>
            <p className="text-2xl font-black text-slate-800">
              {totalVehicles} <span className="text-xs font-semibold text-slate-400">Units</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="inline-flex items-center text-emerald-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                {availableVehicles} Avail
              </span>
              <span className="text-slate-300">|</span>
              <span className="inline-flex items-center text-blue-600 font-bold">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
                {allocatedVehicles} On Trip
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        {/* 2. Pending Demands */}
        <div className="bg-white rounded-xl shadow-xs p-5 border border-slate-200 flex items-center justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              Pending Requests
            </p>
            <p className="text-2xl font-black text-slate-800">
              {pendingRequestsCount} <span className="text-xs font-semibold text-slate-400">Orders</span>
            </p>
            <p className="text-xs text-amber-600 font-bold mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting Allocation</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* 3. Monthly Run Mileage */}
        <div className="bg-white rounded-xl shadow-xs p-5 border border-slate-200 flex items-center justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
              Distance ({currentMonthLabel})
            </p>
            <p className="text-2xl font-black text-slate-800">
              {formatNumber(monthTotalKm, 1)} <span className="text-xs font-semibold text-slate-400">KM</span>
            </p>
            <p className="text-xs text-purple-600 font-bold mt-2 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{completedTripsCount} Trips Finished</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* 4. Consolidation Net Savings */}
        <div className="bg-emerald-50/80 rounded-xl shadow-xs p-5 border border-emerald-200 flex items-center justify-between min-h-[120px]">
          <div>
            <p className="text-[11px] text-emerald-800 font-bold uppercase tracking-wider mb-1">
              Combine Savings (Month)
            </p>
            <p className="text-2xl font-black text-emerald-700">
              Rs. {formatNumber(totalConsolidationSavings, 0)}
            </p>
            <p className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 font-bold" />
              <span>{savingsPct}% Cost Reduction</span>
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts & Analytics Row (2 Columns matching PHP) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 7-Day Performance & Mileage Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Dispatch Activity & Mileage Trend</h3>
              <p className="text-xs text-slate-500">Daily dispatched delivery trips and mileage over the last 7 days</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              Last 7 Days
            </span>
          </div>

          <div className="h-64 w-full relative">
            <TrendPerformanceChart
              labels={trendDays.map((d) => d.dayLabel)}
              tripsData={trendDays.map((d) => d.count)}
              kmData={trendDays.map((d) => d.km)}
            />
          </div>
        </div>

        {/* Right 1 Col: Fleet Status & Utilization Doughnut */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3 mb-2">
            <h3 className="text-sm font-bold text-slate-800">Fleet Utilization Status</h3>
            <p className="text-xs text-slate-500">Monthly trip frequency per vehicle</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center">
            <FleetUtilDoughnutChart
              highlyUtilised={highlyUtilised}
              underUtilised={underUtilised}
              unusedVehicles={unusedVehicles}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center text-xs mt-2">
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <span className="block text-[10px] font-bold text-emerald-800 uppercase">&gt;3 Trips</span>
              <span className="text-base font-bold text-emerald-700">{highlyUtilised}</span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
              <span className="block text-[10px] font-bold text-amber-800 uppercase">1-3 Trips</span>
              <span className="text-base font-bold text-amber-700">{underUtilised}</span>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-600 uppercase">Idle</span>
              <span className="text-base font-bold text-slate-800">{unusedVehicles}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Consolidation & Demand Row (3 Columns matching PHP) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Monthly Transport Spend Financial Impact */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Monthly Transport Spend</span>
              </h3>
              <span className="text-[10px] font-bold text-slate-400">
                Diesel @ Rs. {dieselRate.toFixed(0)}
              </span>
            </div>

            <div className="space-y-2.5 text-xs mb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Standalone Dispatches:</span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  {formatCurrency(totalStandaloneCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Actual Combined Spend:</span>
                <span className="font-bold text-blue-700 tabular-nums">
                  {formatCurrency(totalMonthCost)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Estimated Fuel Spend:</span>
                <span className="font-semibold text-amber-700 tabular-nums">
                  {formatCurrency(totalFuelCost)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                  Total Net Savings
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold">
                  {savingsPct}% saved via load combining
                </span>
              </div>
              <span className="text-base font-black text-emerald-700 tabular-nums">
                Rs. {formatNumber(totalConsolidationSavings, 0)}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/allocations/fg/combine"
              className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-between"
            >
              <span>View Combine Trips Registry</span>
              <ArrowRight className="w-3.5 h-3.5 font-bold" />
            </Link>
          </div>
        </div>

        {/* 2. Combine Opportunities Action Card */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Combine Opportunities</span>
              </h3>
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {consolidationOpportunities} Groups Ready
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-2xl font-black mb-2 shadow-2xs">
                {consolidationOpportunities}
              </div>
              <h4 className="text-xs font-bold text-slate-800">Unallocated Same-Day Corridors</h4>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[220px]">
                Pending requests from same origin and dates can be combined to save costs.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/allocations/fg"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-2xs flex items-center justify-center gap-1.5"
            >
              <Combine className="w-3.5 h-3.5" />
              <span>Allocate & Combine Deliveries</span>
            </Link>
          </div>
        </div>

        {/* 3. Top Plant Demand */}
        <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Top Plant Demand</span>
              </h3>
              <Link href="/requests" className="text-xs text-blue-600 font-bold hover:underline">
                Requests &rarr;
              </Link>
            </div>

            <div className="space-y-2.5">
              {highestDemandPlants.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No request data found.</p>
              ) : (
                highestDemandPlants.map((plant, idx) => {
                  const pct = Math.min(100, Math.round((plant.reqCount / maxPlantReqs) * 100));
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-0.5">
                        <span className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400 font-semibold">#{idx + 1}</span>
                          <span>{plant.plantName}</span>
                        </span>
                        <span className="text-slate-600 tabular-nums text-[11px]">
                          {plant.reqCount} reqs{" "}
                          <span className="text-slate-400 font-normal">
                            ({formatNumber(plant.totalCbm, 1)} CBM)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3">
            <Link
              href="/requests/create"
              className="text-xs text-blue-600 font-bold hover:underline flex items-center justify-between"
            >
              <span>+ Create New Request</span>
              <PlusCircle className="w-3.5 h-3.5 font-bold" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Delivery Trips Table - Full Width */}
      <div className="w-full bg-white rounded-xl shadow-2xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Recent Delivery Trips
            </h3>
            <p className="text-[11px] text-slate-500">
              Recently dispatched vehicle trips and operational status
            </p>
          </div>
          <Link
            href="/allocations/fg/combine"
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            <span>View All Trips</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-200 border-b border-slate-300 text-slate-700 text-[10.5px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-3.5 py-2">Trip No</th>
                <th className="px-3.5 py-2">Date</th>
                <th className="px-3.5 py-2">Vehicle</th>
                <th className="px-3.5 py-2">Driver</th>
                <th className="px-3.5 py-2">Route</th>
                <th className="px-3.5 py-2 text-center">Orders</th>
                <th className="px-3.5 py-2 text-right">Distance</th>
                <th className="px-3.5 py-2 text-center">Status</th>
                <th className="px-3.5 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-slate-400">
                    No recent delivery trips recorded.
                  </td>
                </tr>
              ) : (
                recentTrips.map((rt) => {
                  const tripDate = new Date(rt.createdAt).toISOString().slice(0, 10);
                  const km = Number(rt.actualKm) > 0 ? Number(rt.actualKm) : Number(rt.plannedKm) || 0;
                  return (
                    <tr key={rt.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2 font-bold text-blue-600 whitespace-nowrap">
                        <Link href={`/allocations/fg/combine/${rt.id}`} className="hover:underline">
                          {rt.tripNo}
                        </Link>
                      </td>
                      <td className="px-3.5 py-2 text-slate-500 whitespace-nowrap tabular-nums text-[10.5px]">
                        {tripDate}
                      </td>
                      <td className="px-3.5 py-2 font-bold text-slate-800 whitespace-nowrap">
                        {rt.vehicle?.vehicleNumber || "-"}
                      </td>
                      <td className="px-3.5 py-2 text-slate-600 whitespace-nowrap">
                        {rt.driver?.name || "-"}
                      </td>
                      <td
                        className="px-3.5 py-2 font-medium text-slate-800"
                        title={rt.route?.routeName || "Custom Route"}
                      >
                        {rt.route?.routeName || "Custom Route"}
                      </td>
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 tabular-nums">
                          {rt._count?.tripRequests || 0} Orders
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-bold text-slate-800 whitespace-nowrap tabular-nums">
                        {formatNumber(km, 1)} km
                      </td>
                      <td className="px-3.5 py-2 text-center whitespace-nowrap">
                        <StatusBadge status={rt.status} />
                      </td>
                      <td className="px-3.5 py-2 text-right whitespace-nowrap">
                        <Link
                          href={`/allocations/fg/combine/${rt.id}`}
                          className="bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white px-2.5 py-1 rounded text-[10.5px] font-semibold transition border border-slate-200 hover:border-transparent inline-flex items-center gap-1"
                        >
                          <span>Workbench</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
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
