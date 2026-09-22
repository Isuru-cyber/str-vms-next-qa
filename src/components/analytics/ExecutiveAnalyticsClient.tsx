'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Truck,
  Package,
  Calendar,
  Fuel,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Scale,
  Boxes,
  Route as RouteIcon,
  Percent,
  SlidersHorizontal,
  Activity,
  Layers,
  Clock,
  ExternalLink,
  ShieldCheck,
  Gauge,
  Wrench,
} from 'lucide-react';
import Chart from 'chart.js/auto';
import { formatNumber } from '@/lib/utils';
import { CostCalculator } from '@/lib/cost-calculator';

// Reusable Safe Chart Component
interface ChartCanvasProps {
  type: string;
  data: any;
  options?: any;
  className?: string;
}

function ChartCanvas({ type, data, options, className = 'h-72 w-full' }: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    try {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }

      chartInstanceRef.current = new Chart(ctx, {
        type: type as any,
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                font: { size: 11, weight: 'normal' as any },
                color: '#64748b',
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              padding: 10,
              cornerRadius: 8,
              titleFont: { size: 12, weight: 'bold' as any },
              bodyFont: { size: 11 },
            },
          },
          ...options,
        },
      });
    } catch (err) {
      console.warn('Chart render deferred:', err);
    }

    return () => {
      try {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
          chartInstanceRef.current = null;
        }
      } catch (err) {}
    };
  }, [type, data, options]);

  return (
    <div className={className}>
      <canvas ref={canvasRef} />
    </div>
  );
}

interface ExecutiveAnalyticsProps {
  initialTrips: any[];
  initialRequests: any[];
  initialVehicles: any[];
  initialPlants: any[];
  dieselRate: number;
  currentMonth: string;
}

export function ExecutiveAnalyticsClient({
  initialTrips = [],
  initialRequests = [],
  initialVehicles = [],
  initialPlants = [],
  dieselRate = 382.0,
  currentMonth = '2026-09',
}: ExecutiveAnalyticsProps) {
  // 5 Sub-Tabs for Strategic Perspectives
  const [subTab, setSubTab] = useState<'financial' | 'rates' | 'fleet' | 'plants' | 'routes' | 'demand'>('financial');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [fleetMode, setFleetMode] = useState<'all' | 'fixed' | 'km_based'>('all');

  // Filter trips by selected month
  const filteredTrips = useMemo(() => {
    return initialTrips.filter((trip) => {
      const dateStr = trip.startDate || trip.createdAt;
      if (!dateStr) return false;
      const tripMonth = new Date(dateStr).toISOString().substring(0, 7);
      return tripMonth === selectedMonth;
    });
  }, [initialTrips, selectedMonth]);

  // Filter requests by selected month
  const filteredRequests = useMemo(() => {
    return initialRequests.filter((req) => {
      const dateStr = req.requiredDate || req.createdAt;
      if (!dateStr) return false;
      const reqMonth = new Date(dateStr).toISOString().substring(0, 7);
      return reqMonth === selectedMonth;
    });
  }, [initialRequests, selectedMonth]);

  // Computed Trip Costs
  const computedTripCosts = useMemo(() => {
    return filteredTrips.map((trip) => {
      const vehicle = trip.vehicle || {};
      const breakdown = CostCalculator.calculateTripCost(
        Number(trip.calculatedKm || trip.actualKm || 0),
        {
          fuelConsumptionKml: vehicle.fuelConsumptionKml,
          runningCostPerKm: vehicle.runningCostPerKm,
          profitPerKm: vehicle.profitPerKm,
          fixedCostPerDay: vehicle.fixedCostPerDay,
        },
        dieselRate
      );
      let savings: any = {
        net_savings: 0,
        savings_pct: 0,
        standalone_total_cost: breakdown.total_trip_cost,
        actual_combined_cost: breakdown.total_trip_cost,
      };
      try {
        const linkedReqs = (trip.tripRequests || []).map((tr: any) => ({
          id: tr.request?.id || tr.requestId || 0,
          request_code: tr.request?.requestCode || '',
          from_name: tr.request?.fromLocation?.name || '',
          to_name: tr.request?.toLocation?.name || '',
          planned_distance_km: tr.request?.plannedDistanceKm || 0,
          required_kg: tr.request?.weightKg || 0,
          required_cbm: tr.request?.volumeCbm || 0,
        }));
        savings = CostCalculator.calculateConsolidationSavings(
          breakdown.total_trip_cost,
          vehicle,
          linkedReqs,
          dieselRate
        );
      } catch (err) {
        savings = {
          net_savings: 0,
          savings_pct: 0,
          standalone_total_cost: breakdown.total_trip_cost,
          actual_combined_cost: breakdown.total_trip_cost,
        };
      }
      return {
        ...trip,
        breakdown,
        savings,
      };
    });
  }, [filteredTrips, dieselRate]);

  // Global Financial Aggregates
  const financialMetrics = useMemo(() => {
    let totalFuel = 0;
    let totalRunning = 0;
    let totalProfit = 0;
    let totalDailyFixed = 0;
    let totalTripCost = 0;
    let totalNetSavings = 0;
    let totalKm = 0;

    computedTripCosts.forEach((t) => {
      totalFuel += t.breakdown.fuel_cost;
      totalRunning += t.breakdown.running_cost;
      totalProfit += t.breakdown.driver_profit;
      totalDailyFixed += t.breakdown.fixed_daily_cost;
      totalTripCost += t.breakdown.total_trip_cost;
      totalNetSavings += t.savings?.net_savings || 0;
      totalKm += t.breakdown.km;
    });

    // Fixed fleet monthly rents
    let totalFixedRents = 0;
    initialVehicles.forEach((v) => {
      if (v.ownershipType === 'FIXED_CONTRACT' || v.monthlyFixedRate) {
        totalFixedRents += Number(v.monthlyFixedRate || 0);
      }
    });

    const grandTotalSpend = totalTripCost + totalFixedRents;
    const avgCostPerKm = totalKm > 0 ? grandTotalSpend / totalKm : 0;
    const savingsRoiPct =
      grandTotalSpend + totalNetSavings > 0
        ? (totalNetSavings / (grandTotalSpend + totalNetSavings)) * 100
        : 0;

    let totalKg = 0;
    let totalCbm = 0;
    filteredRequests.forEach((r) => {
      totalKg += Number(r.weightKg || 0);
      totalCbm += Number(r.volumeCbm || 0);
    });

    const avgCostPerKg = totalKg > 0 ? grandTotalSpend / totalKg : 0;
    const avgCostPerCbm = totalCbm > 0 ? grandTotalSpend / totalCbm : 0;

    return {
      totalFuel,
      totalRunning,
      totalProfit,
      totalDailyFixed,
      totalTripCost,
      totalFixedRents,
      grandTotalSpend,
      totalNetSavings,
      savingsRoiPct,
      totalKm,
      avgCostPerKm,
      totalKg,
      totalCbm,
      avgCostPerKg,
      avgCostPerCbm,
    };
  }, [computedTripCosts, initialVehicles, filteredRequests]);

  // Unit Rates & Unit Economics Analysis (Per KG, Per CBM, Per Trip, Per KM)
  const unitRatesMetrics = useMemo(() => {
    const totalTrips = computedTripCosts.length;
    const grandTotalSpend = financialMetrics.grandTotalSpend;
    const totalKm = financialMetrics.totalKm;
    const totalKg = financialMetrics.totalKg;
    const totalCbm = financialMetrics.totalCbm;
    const totalNetSavings = financialMetrics.totalNetSavings;

    // Primary Overall Rates
    const costPerKg = totalKg > 0 ? grandTotalSpend / totalKg : 0;
    const costPerCbm = totalCbm > 0 ? grandTotalSpend / totalCbm : 0;
    const costPerTrip = totalTrips > 0 ? grandTotalSpend / totalTrips : 0;
    const costPerKm = totalKm > 0 ? grandTotalSpend / totalKm : 0;

    // Consolidation impact on unit rates
    const standaloneSpend = grandTotalSpend + totalNetSavings;
    const standaloneCostPerKg = totalKg > 0 ? standaloneSpend / totalKg : 0;
    const standaloneCostPerCbm = totalCbm > 0 ? standaloneSpend / totalCbm : 0;
    const standaloneCostPerTrip = totalTrips > 0 ? standaloneSpend / totalTrips : 0;

    const savingsPerKg = Math.max(0, standaloneCostPerKg - costPerKg);
    const savingsPerCbm = Math.max(0, standaloneCostPerCbm - costPerCbm);
    const savingsPerTrip = Math.max(0, standaloneCostPerTrip - costPerTrip);

    // Freight Density Ratio (KG per CBM)
    const avgDensityKgPerCbm = totalCbm > 0 ? totalKg / totalCbm : 0;

    // 1. Plant-wise Freight Rate Analysis
    const plantMap: Record<string, {
      plantCode: string;
      plantName: string;
      trips: Set<number>;
      requestsCount: number;
      totalKg: number;
      totalCbm: number;
      totalSpend: number;
    }> = {};

    initialPlants.forEach((p) => {
      const code = p.code || p.name || 'Plant';
      plantMap[code] = {
        plantCode: code,
        plantName: p.name || code,
        trips: new Set<number>(),
        requestsCount: 0,
        totalKg: 0,
        totalCbm: 0,
        totalSpend: 0,
      };
    });

    computedTripCosts.forEach((t) => {
      const trCount = (t.tripRequests || []).length;
      (t.tripRequests || []).forEach((tr: any) => {
        const r = tr.request;
        if (!r) return;
        const pCode = r.plant?.code || r.plant?.name || 'General';
        if (!plantMap[pCode]) {
          plantMap[pCode] = {
            plantCode: pCode,
            plantName: r.plant?.name || pCode,
            trips: new Set<number>(),
            requestsCount: 0,
            totalKg: 0,
            totalCbm: 0,
            totalSpend: 0,
          };
        }
        plantMap[pCode].trips.add(t.id);
        plantMap[pCode].requestsCount += 1;
        plantMap[pCode].totalKg += Number(r.weightKg || r.requiredKg || 0);
        plantMap[pCode].totalCbm += Number(r.volumeCbm || r.requiredCbm || 0);
        const allocatedSpend = trCount > 0 ? Number(t.breakdown?.total_trip_cost || 0) / trCount : 0;
        plantMap[pCode].totalSpend += allocatedSpend;
      });
    });

    const plantRatesList = Object.values(plantMap)
      .map((p) => {
        const tripsCount = p.trips.size;
        const kg = p.totalKg;
        const cbm = p.totalCbm;
        const spend = p.totalSpend;
        const ratePerKg = kg > 0 ? spend / kg : 0;
        const ratePerCbm = cbm > 0 ? spend / cbm : 0;
        const ratePerTrip = tripsCount > 0 ? spend / tripsCount : 0;
        return {
          plantCode: p.plantCode,
          plantName: p.plantName,
          tripsCount,
          requestsCount: p.requestsCount,
          totalKg: kg,
          totalCbm: cbm,
          totalSpend: spend,
          ratePerKg,
          ratePerCbm,
          ratePerTrip,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    // 2. Vehicle Category Unit Economics Matrix
    const vehicleCategoryMap: Record<string, {
      category: string;
      tripsCount: number;
      totalKm: number;
      totalKg: number;
      totalCbm: number;
      totalSpend: number;
    }> = {};

    computedTripCosts.forEach((t) => {
      const vType = t.vehicle?.vehicleType || 'Standard Truck';
      if (!vehicleCategoryMap[vType]) {
        vehicleCategoryMap[vType] = {
          category: vType,
          tripsCount: 0,
          totalKm: 0,
          totalKg: 0,
          totalCbm: 0,
          totalSpend: 0,
        };
      }
      vehicleCategoryMap[vType].tripsCount += 1;
      vehicleCategoryMap[vType].totalKm += Number(t.breakdown?.km || 0);
      vehicleCategoryMap[vType].totalSpend += Number(t.breakdown?.total_trip_cost || 0);

      (t.tripRequests || []).forEach((tr: any) => {
        const r = tr.request;
        if (r) {
          vehicleCategoryMap[vType].totalKg += Number(r.weightKg || r.requiredKg || 0);
          vehicleCategoryMap[vType].totalCbm += Number(r.volumeCbm || r.requiredCbm || 0);
        }
      });
    });

    const vehicleCategoryList = Object.values(vehicleCategoryMap)
      .map((vc) => {
        const ratePerKm = vc.totalKm > 0 ? vc.totalSpend / vc.totalKm : 0;
        const ratePerTrip = vc.tripsCount > 0 ? vc.totalSpend / vc.tripsCount : 0;
        const ratePerKg = vc.totalKg > 0 ? vc.totalSpend / vc.totalKg : 0;
        const ratePerCbm = vc.totalCbm > 0 ? vc.totalSpend / vc.totalCbm : 0;
        return {
          ...vc,
          ratePerKm,
          ratePerTrip,
          ratePerKg,
          ratePerCbm,
        };
      })
      .sort((a, b) => b.totalSpend - a.totalSpend);

    // 3. Distance / Route Tier Breakdown
    const distanceTiers: Record<string, {
      name: string;
      trips: number;
      totalSpend: number;
      totalKg: number;
      totalCbm: number;
      totalKm: number;
    }> = {
      local: { name: 'Short-Haul (< 50 km)', trips: 0, totalSpend: 0, totalKg: 0, totalCbm: 0, totalKm: 0 },
      regional: { name: 'Mid-Haul (50 - 150 km)', trips: 0, totalSpend: 0, totalKg: 0, totalCbm: 0, totalKm: 0 },
      longHaul: { name: 'Long-Haul (> 150 km)', trips: 0, totalSpend: 0, totalKg: 0, totalCbm: 0, totalKm: 0 },
    };

    computedTripCosts.forEach((t) => {
      const km = Number(t.breakdown?.km || 0);
      const spend = Number(t.breakdown?.total_trip_cost || 0);
      let tier = distanceTiers.local;
      if (km > 150) tier = distanceTiers.longHaul;
      else if (km >= 50) tier = distanceTiers.regional;

      tier.trips += 1;
      tier.totalSpend += spend;
      tier.totalKm += km;
      (t.tripRequests || []).forEach((tr: any) => {
        const r = tr.request;
        if (r) {
          tier.totalKg += Number(r.weightKg || r.requiredKg || 0);
          tier.totalCbm += Number(r.volumeCbm || r.requiredCbm || 0);
        }
      });
    });

    const distanceTiersList = Object.values(distanceTiers).map((dt) => ({
      ...dt,
      ratePerTrip: dt.trips > 0 ? dt.totalSpend / dt.trips : 0,
      ratePerKm: dt.totalKm > 0 ? dt.totalSpend / dt.totalKm : 0,
      ratePerKg: dt.totalKg > 0 ? dt.totalSpend / dt.totalKg : 0,
      ratePerCbm: dt.totalCbm > 0 ? dt.totalSpend / dt.totalCbm : 0,
    }));

    return {
      totalTrips,
      costPerKg,
      costPerCbm,
      costPerTrip,
      costPerKm,
      standaloneCostPerKg,
      standaloneCostPerCbm,
      standaloneCostPerTrip,
      savingsPerKg,
      savingsPerCbm,
      savingsPerTrip,
      avgDensityKgPerCbm,
      plantRatesList,
      vehicleCategoryList,
      distanceTiersList,
    };
  }, [computedTripCosts, financialMetrics, initialPlants]);

  // Fleet & Contract Analysis (Enhanced for Fixed vs KM-Based Separation)
  const fleetMetrics = useMemo(() => {
    let fixedCount = 0;
    let kmCount = 0;
    let totalBaseRent = 0;
    let totalExtraCharges = 0;
    let totalFixedSpend = 0;
    let totalFixedKm = 0;
    let underUtilizedFixedCount = 0;
    let optimalFixedCount = 0;
    let overLimitFixedCount = 0;
    let wastedRentEstimate = 0;

    let totalKmSpend = 0;
    let totalKmDistance = 0;
    let totalKmFuelCost = 0;
    let totalKmRunningCost = 0;
    let totalKmDriverProfit = 0;
    let totalKmDailyFixed = 0;
    let totalKmCombineSavings = 0;

    const vehicleUsageMap: Record<string, {
      km: number;
      trips: number;
      spend: number;
      fuelCost: number;
      runningCost: number;
      driverProfit: number;
      dailyFixed: number;
      combineSavings: number;
    }> = {};

    computedTripCosts.forEach((t) => {
      const vNo = t.vehicle?.vehicleNumber || 'Unknown';
      if (!vehicleUsageMap[vNo]) {
        vehicleUsageMap[vNo] = {
          km: 0,
          trips: 0,
          spend: 0,
          fuelCost: 0,
          runningCost: 0,
          driverProfit: 0,
          dailyFixed: 0,
          combineSavings: 0,
        };
      }
      const km = Number(t.breakdown?.km || 0);
      const spend = Number(t.breakdown?.total_trip_cost || 0);
      const fuelCost = Number(t.breakdown?.fuel_cost || 0);
      const runningCost = Number(t.breakdown?.running_cost || 0);
      const driverProfit = Number(t.breakdown?.driver_profit || 0);
      const dailyFixed = Number(t.breakdown?.fixed_daily_cost || 0);
      const savings = Number(t.consolidation_savings?.net_savings || 0);

      vehicleUsageMap[vNo].km += km;
      vehicleUsageMap[vNo].trips += 1;
      vehicleUsageMap[vNo].spend += spend;
      vehicleUsageMap[vNo].fuelCost += fuelCost;
      vehicleUsageMap[vNo].runningCost += runningCost;
      vehicleUsageMap[vNo].driverProfit += driverProfit;
      vehicleUsageMap[vNo].dailyFixed += dailyFixed;
      vehicleUsageMap[vNo].combineSavings += savings;
    });

    const fixedVehiclesList: any[] = [];
    const kmVehiclesList: any[] = [];

    initialVehicles.forEach((v) => {
      const usage = vehicleUsageMap[v.vehicleNumber] || {
        km: 0,
        trips: 0,
        spend: 0,
        fuelCost: 0,
        runningCost: 0,
        driverProfit: 0,
        dailyFixed: 0,
        combineSavings: 0,
      };
      const isFixed = v.paymentBasis === 'FIXED' || v.ownershipType === 'FIXED_CONTRACT' || Number(v.monthlyFixedRate || 0) > 0;

      if (isFixed) {
        fixedCount++;
        const baseRent = Number(v.monthlyFixedRate || 0);
        const limit = Number(v.monthlyKmLimit || 2500);
        const actualKm = usage.km;
        const extraKm = limit > 0 ? Math.max(0, actualKm - limit) : 0;
        const extraRate = Number(v.extraKmRate || 120);
        const extraCharge = extraKm * extraRate;
        const totalPayout = baseRent + extraCharge;
        const costPerKm = actualKm > 0 ? totalPayout / actualKm : 0;
        const freeKmUsagePct = limit > 0 ? (actualKm / limit) * 100 : 0;

        let status = 'OPTIMAL';
        let statusLabel = 'Optimal';
        if (actualKm === 0) {
          status = 'IDLE';
          statusLabel = 'Idle (100% Wasted Rent)';
          underUtilizedFixedCount++;
          wastedRentEstimate += baseRent;
        } else if (freeKmUsagePct < 50) {
          status = 'UNDER_UTILIZED';
          statusLabel = 'Under-Utilized';
          underUtilizedFixedCount++;
          wastedRentEstimate += baseRent * (1 - actualKm / limit);
        } else if (extraKm > 0) {
          status = 'OVER_LIMIT';
          statusLabel = 'Over-Limit (Penalty Accruing)';
          overLimitFixedCount++;
        } else {
          optimalFixedCount++;
        }

        totalBaseRent += baseRent;
        totalExtraCharges += extraCharge;
        totalFixedSpend += totalPayout;
        totalFixedKm += actualKm;

        fixedVehiclesList.push({
          id: v.id,
          vehicleNumber: v.vehicleNumber,
          type: v.vehicleType || v.type || 'Standard',
          baseRent,
          limit,
          actualKm,
          freeKmUsagePct,
          extraKm,
          extraRate,
          extraCharge,
          totalPayout,
          costPerKm,
          status,
          statusLabel,
          trips: usage.trips,
        });
      } else {
        kmCount++;
        const actualKm = usage.km;
        const totalPayout = usage.spend;
        const costPerKm = actualKm > 0 ? totalPayout / actualKm : 0;

        totalKmSpend += totalPayout;
        totalKmDistance += actualKm;
        totalKmFuelCost += usage.fuelCost;
        totalKmRunningCost += usage.runningCost;
        totalKmDriverProfit += usage.driverProfit;
        totalKmDailyFixed += usage.dailyFixed;
        totalKmCombineSavings += usage.combineSavings;

        kmVehiclesList.push({
          id: v.id,
          vehicleNumber: v.vehicleNumber,
          type: v.vehicleType || v.type || 'Standard',
          trips: usage.trips,
          actualKm,
          fuelConsumption: Number(v.fuelConsumptionKml || 10),
          fuelCost: usage.fuelCost,
          runningCost: usage.runningCost,
          driverProfit: usage.driverProfit,
          dailyFixed: usage.dailyFixed,
          totalPayout,
          costPerKm,
          combineSavings: usage.combineSavings,
        });
      }
    });

    const totalFleetCount = initialVehicles.length;
    const activeVehiclesCount = Object.keys(vehicleUsageMap).length;
    const utilizationRate = totalFleetCount > 0 ? (activeVehiclesCount / totalFleetCount) * 100 : 0;

    const avgFixedCostPerKm = totalFixedKm > 0 ? totalFixedSpend / totalFixedKm : 0;
    const avgKmCostPerKm = totalKmDistance > 0 ? totalKmSpend / totalKmDistance : 0;
    const avgFreeKmUsagePct = fixedVehiclesList.length > 0
      ? fixedVehiclesList.reduce((acc, fv) => acc + fv.freeKmUsagePct, 0) / fixedVehiclesList.length
      : 0;

    const fuelSharePct = totalKmSpend > 0 ? (totalKmFuelCost / totalKmSpend) * 100 : 0;
    const runningSharePct = totalKmSpend > 0 ? (totalKmRunningCost / totalKmSpend) * 100 : 0;
    const driverProfitSharePct = totalKmSpend > 0 ? (totalKmDriverProfit / totalKmSpend) * 100 : 0;
    const dailyFixedSharePct = totalKmSpend > 0 ? (totalKmDailyFixed / totalKmSpend) * 100 : 0;

    return {
      fixedCount,
      kmCount,
      totalFixedSpend,
      totalBaseRent,
      totalExtraCharges,
      totalFixedKm,
      avgFixedCostPerKm,
      underUtilizedFixedCount,
      optimalFixedCount,
      overLimitFixedCount,
      contractBreachCount: overLimitFixedCount,
      wastedRentEstimate,
      avgFreeKmUsagePct,
      fixedVehiclesList: fixedVehiclesList.sort((a, b) => b.totalPayout - a.totalPayout),

      totalKmSpend,
      totalKmDistance,
      avgKmCostPerKm,
      totalKmFuelCost,
      totalKmRunningCost,
      totalKmDriverProfit,
      totalKmDailyFixed,
      totalKmCombineSavings,
      fuelSharePct,
      runningSharePct,
      driverProfitSharePct,
      dailyFixedSharePct,
      kmVehiclesList: kmVehiclesList.sort((a, b) => b.totalPayout - a.totalPayout),

      fixedVehiclesSpend: totalFixedSpend,
      kmVehiclesSpend: totalKmSpend,
      utilizationRate,
      vehicleUsageMap,
    };
  }, [computedTripCosts, initialVehicles]);

  // Plant Cost Breakdown
  const plantMetrics = useMemo(() => {
    const plantMap: Record<string, { name: string; requests: number; kg: number; cbm: number; spend: number }> = {};

    initialPlants.forEach((p) => {
      plantMap[p.code || p.name] = { name: p.name, requests: 0, kg: 0, cbm: 0, spend: 0 };
    });

    filteredRequests.forEach((req) => {
      const pKey = req.plant?.code || req.plant?.name || 'General';
      if (!plantMap[pKey]) {
        plantMap[pKey] = { name: req.plant?.name || pKey, requests: 0, kg: 0, cbm: 0, spend: 0 };
      }
      plantMap[pKey].requests += 1;
      plantMap[pKey].kg += Number(req.weightKg || 0);
      plantMap[pKey].cbm += Number(req.volumeCbm || 0);

      const linkedTripReq = req.tripRequests?.[0];
      if (linkedTripReq?.trip) {
        const tripKm = Number(linkedTripReq.trip.calculatedKm || linkedTripReq.trip.actualKm || 0);
        const estCost = tripKm * 180;
        plantMap[pKey].spend += estCost;
      }
    });

    const list = Object.values(plantMap).sort((a, b) => b.spend - a.spend);
    const topPlant = list[0] || { name: 'None', spend: 0 };
    const totalPlantSpend = list.reduce((sum, p) => sum + p.spend, 0);

    return {
      list,
      topPlant,
      totalPlantSpend,
    };
  }, [filteredRequests, initialPlants]);

  // Route Metrics
  const routeMetrics = useMemo(() => {
    const routeMap: Record<string, { routeName: string; trips: number; totalKm: number; spend: number }> = {};

    computedTripCosts.forEach((t) => {
      const rName =
        t.route?.name ||
        (t.startLocation && t.endLocation ? `${t.startLocation} -> ${t.endLocation}` : 'Direct Run');
      if (!routeMap[rName]) {
        routeMap[rName] = { routeName: rName, trips: 0, totalKm: 0, spend: 0 };
      }
      routeMap[rName].trips += 1;
      routeMap[rName].totalKm += t.breakdown.km;
      routeMap[rName].spend += t.breakdown.total_trip_cost;
    });

    const list = Object.values(routeMap).sort((a, b) => b.spend - a.spend);
    const topRoutes = list.slice(0, 5);
    const totalRouteSpend = list.reduce((sum, r) => sum + r.spend, 0);

    return {
      list,
      topRoutes,
      totalRouteSpend,
      activeCorridorsCount: list.length,
    };
  }, [computedTripCosts]);

  // Demand & SLA Metrics
  const demandMetrics = useMemo(() => {
    const totalRequests = filteredRequests.length;
    let fulfilledCount = 0;
    let combinedCount = 0;
    const dayOfWeekCounts: number[] = [0, 0, 0, 0, 0, 0, 0];

    filteredRequests.forEach((r) => {
      if (['ALLOCATED', 'DISPATCHED', 'COMPLETED', 'FINALIZED'].includes(r.status)) {
        fulfilledCount++;
      }
      if (r.tripRequests && r.tripRequests.length > 0) {
        combinedCount++;
      }
      const d = new Date(r.requiredDate || r.createdAt);
      if (!isNaN(d.getTime())) {
        dayOfWeekCounts[d.getDay()]++;
      }
    });

    const fulfillmentRate = totalRequests > 0 ? (fulfilledCount / totalRequests) * 100 : 0;
    const combinedRatio = totalRequests > 0 ? (combinedCount / totalRequests) * 100 : 0;

    return {
      totalRequests,
      fulfilledCount,
      fulfillmentRate,
      combinedCount,
      combinedRatio,
      dayOfWeekCounts,
    };
  }, [filteredRequests]);

  return (
    <div className="space-y-4 w-full">
      {/* ---------------------------------------------------- */}
      {/* TOP STRATEGIC HEADER & NAVIGATION                    */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* 5 Strategic Perspective Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setSubTab('financial')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center whitespace-nowrap ${
              subTab === 'financial'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Financial & Costs
          </button>
          <button
            onClick={() => setSubTab('rates')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center whitespace-nowrap ${
              subTab === 'rates'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5 mr-1.5" /> Unit Rates (KG / CBM / Trip)
          </button>
          <button
            onClick={() => setSubTab('fleet')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center whitespace-nowrap ${
              subTab === 'fleet'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5 mr-1.5" /> Fleet & Contracts
          </button>
          <button
            onClick={() => setSubTab('plants')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center whitespace-nowrap ${
              subTab === 'plants'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Plant Logistics
          </button>
          <button
            onClick={() => setSubTab('routes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center whitespace-nowrap ${
              subTab === 'routes'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RouteIcon className="w-3.5 h-3.5 mr-1.5" /> Routes & Network
          </button>
          <button
            onClick={() => setSubTab('demand')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center whitespace-nowrap ${
              subTab === 'demand'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-3.5 h-3.5 mr-1.5" /> Demand & SLAs
          </button>
        </div>

        {/* Month Selector & Link to Full Reports */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-white"
            />
          </div>

          <Link
            href="/reports"
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="View Raw Data Tables & Export Excel"
          >
            <Layers className="w-3.5 h-3.5 mr-1 text-blue-600" /> Full Data Reports
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 1: FINANCIAL & COSTS PERSPECTIVE             */}
      {/* ---------------------------------------------------- */}
      {subTab === 'financial' && (
        <div className="space-y-4">
          {/* Dashboard-Style Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Spend */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Total Logistics Spend
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  Rs. {formatNumber(financialMetrics.grandTotalSpend, 2)}
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                  <span>Fuel: Rs. {formatNumber(financialMetrics.totalFuel, 0)}</span>
                  <span className="text-slate-300">|</span>
                  <span>Fixed: Rs. {formatNumber(financialMetrics.totalFixedRents, 0)}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Combine Savings ROI */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Combine Allocation ROI
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  Rs. {formatNumber(financialMetrics.totalNetSavings, 2)}
                </p>
                <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{financialMetrics.savingsRoiPct.toFixed(1)}% freight cost reduction</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                <PiggyBank className="w-6 h-6" />
              </div>
            </div>

            {/* Average Cost per KM */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Average Cost per KM
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  Rs. {formatNumber(financialMetrics.avgCostPerKm, 2)}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1">
                  <span>Run Distance: {formatNumber(financialMetrics.totalKm, 1)} KM</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Unit Freight Cost */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Unit Freight Cost
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  Rs. {formatNumber(financialMetrics.avgCostPerKg, 2)}{' '}
                  <span className="text-xs font-normal text-slate-400">/ KG</span>
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-1">
                  <span>Rs. {formatNumber(financialMetrics.avgCostPerCbm, 2)} / CBM</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                <Scale className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cost Component Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Distribution of Fuel, Maintenance, Driver Profit, and Fixed Fleet Lease
                  </p>
                </div>
              </div>
              <ChartCanvas
                type="bar"
                data={{
                  labels: ['Fuel Expense', 'Running Maint.', 'Driver Profit', 'Daily Fixed', 'Fixed Lease'],
                  datasets: [
                    {
                      label: 'Amount (LKR)',
                      data: [
                        financialMetrics.totalFuel,
                        financialMetrics.totalRunning,
                        financialMetrics.totalProfit,
                        financialMetrics.totalDailyFixed,
                        financialMetrics.totalFixedRents,
                      ],
                      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6'],
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Spend Proportion</h3>
                  <p className="text-xs text-slate-500 font-normal">Component share of total freight</p>
                </div>
              </div>
              <ChartCanvas
                type="doughnut"
                data={{
                  labels: ['Fuel', 'Maintenance', 'Driver Profit', 'Fixed Contracts'],
                  datasets: [
                    {
                      data: [
                        financialMetrics.totalFuel,
                        financialMetrics.totalRunning,
                        financialMetrics.totalProfit,
                        financialMetrics.totalFixedRents + financialMetrics.totalDailyFixed,
                      ],
                      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
                    },
                  ],
                }}
              />
            </div>
          </div>

          {/* Strategic Decision Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg shadow-xs mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Executive Decision Insight: Financial Strategy
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                  Consolidating multiple delivery orders onto shared routes yielded{' '}
                  <strong className="text-slate-800 font-semibold">
                    Rs. {formatNumber(financialMetrics.totalNetSavings, 2)}
                  </strong>{' '}
                  in net savings this period ({financialMetrics.savingsRoiPct.toFixed(1)}% cost reduction).
                  Maintaining load factors above 75% directly insulates margins against diesel index adjustments.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB: UNIT RATES & FREIGHT ECONOMICS              */}
      {/* ---------------------------------------------------- */}
      {subTab === 'rates' && (
        <div className="space-y-4">
          {/* Top 4 Dashboard Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cost Per KG */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Freight Rate Per KG
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  Rs. {formatNumber(unitRatesMetrics.costPerKg, 2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ KG</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-semibold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Saved Rs. {unitRatesMetrics.savingsPerKg.toFixed(2)}/KG via combine</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                <Scale className="w-6 h-6" />
              </div>
            </div>

            {/* Cost Per CBM */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Freight Rate Per CBM
                </p>
                <p className="text-2xl font-bold text-indigo-700">
                  Rs. {formatNumber(unitRatesMetrics.costPerCbm, 2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ CBM</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-600 font-medium">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>Density: {unitRatesMetrics.avgDensityKgPerCbm.toFixed(1)} KG/CBM</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                <Boxes className="w-6 h-6" />
              </div>
            </div>

            {/* Cost Per Trip */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Average Cost Per Trip
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  Rs. {formatNumber(unitRatesMetrics.costPerTrip, 0)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ Trip</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span>{unitRatesMetrics.totalTrips} Completed Dispatches</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <Truck className="w-6 h-6" />
              </div>
            </div>

            {/* Cost Per KM */}
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Operating Cost Per KM
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  Rs. {formatNumber(unitRatesMetrics.costPerKm, 2)}
                  <span className="text-xs font-normal text-slate-400 ml-1">/ KM</span>
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                  <span>Fuel: Rs. {financialMetrics.totalKm > 0 ? (financialMetrics.totalFuel / financialMetrics.totalKm).toFixed(1) : 0}/KM</span>
                  <span className="text-slate-300">|</span>
                  <span>{formatNumber(financialMetrics.totalKm, 0)} Total KM</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                <RouteIcon className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Consolidation Efficiency Advantage Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 mb-1.5">
                  <PiggyBank className="w-3.5 h-3.5" /> Combine Allocation Efficiency Advantage
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  Standalone Uncombined Rate vs Consolidated Multi-Drop Rate
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-normal">
                  By pooling delivery requests into combined loads, company-wide freight unit economics improved across all dimensions:
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate / KG</span>
                  <span className="text-xs text-slate-400 line-through block">Rs. {formatNumber(unitRatesMetrics.standaloneCostPerKg, 2)}</span>
                  <span className="text-sm font-bold text-emerald-700">Rs. {formatNumber(unitRatesMetrics.costPerKg, 2)}</span>
                  <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">(-Rs. {unitRatesMetrics.savingsPerKg.toFixed(2)})</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate / CBM</span>
                  <span className="text-xs text-slate-400 line-through block">Rs. {formatNumber(unitRatesMetrics.standaloneCostPerCbm, 0)}</span>
                  <span className="text-sm font-bold text-emerald-700">Rs. {formatNumber(unitRatesMetrics.costPerCbm, 0)}</span>
                  <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">(-Rs. {unitRatesMetrics.savingsPerCbm.toFixed(0)})</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Cost / Trip</span>
                  <span className="text-xs text-slate-400 line-through block">Rs. {formatNumber(unitRatesMetrics.standaloneCostPerTrip, 0)}</span>
                  <span className="text-sm font-bold text-emerald-700">Rs. {formatNumber(unitRatesMetrics.costPerTrip, 0)}</span>
                  <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">(-Rs. {formatNumber(unitRatesMetrics.savingsPerTrip, 0)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Charts: Plant Rates & Vehicle Category Rates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Plant Freight Rate Benchmark */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Plant Freight Rate Benchmark (Rs. / KG)
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Comparing transportation cost per KG across manufacturing facilities
                  </p>
                </div>
              </div>
              <ChartCanvas
                type="bar"
                data={{
                  labels: unitRatesMetrics.plantRatesList.slice(0, 7).map((p) => p.plantName),
                  datasets: [
                    {
                      label: 'Cost per KG (Rs./KG)',
                      data: unitRatesMetrics.plantRatesList.slice(0, 7).map((p) => Number(p.ratePerKg.toFixed(2))),
                      backgroundColor: '#8b5cf6',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>

            {/* Chart 2: Vehicle Size Unit Economics */}
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Vehicle Type Rate Efficiency (Cost / KM)
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Operating cost per kilometer by truck type and payload capacity
                  </p>
                </div>
              </div>
              <ChartCanvas
                type="bar"
                data={{
                  labels: unitRatesMetrics.vehicleCategoryList.map((vc) => vc.category),
                  datasets: [
                    {
                      label: 'Avg Cost per KM (Rs./KM)',
                      data: unitRatesMetrics.vehicleCategoryList.map((vc) => Number(vc.ratePerKm.toFixed(2))),
                      backgroundColor: '#3b82f6',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>
          </div>

          {/* Distance Tier Breakdown (Short vs Mid vs Long Haul) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mileage & Route Distance Tier Economics
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-normal">
              Cost efficiency variations across local deliveries, mid-distance routes, and inter-provincial long hauls
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {unitRatesMetrics.distanceTiersList.map((tier) => (
                <div key={tier.name} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{tier.name}</span>
                    <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {tier.trips} Trips
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Cost / Trip</span>
                      <span className="font-bold text-slate-800">Rs. {formatNumber(tier.ratePerTrip, 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Cost / KM</span>
                      <span className="font-bold text-slate-800">Rs. {formatNumber(tier.ratePerKm, 2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Cost / KG</span>
                      <span className="font-bold text-purple-700">Rs. {formatNumber(tier.ratePerKg, 2)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-semibold uppercase">Cost / CBM</span>
                      <span className="font-bold text-indigo-700">Rs. {formatNumber(tier.ratePerCbm, 0)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plant-wise Unit Rates Analysis Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Plant-Wise Freight Rate Economics Matrix
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Per-unit freight costs, tonnage dispatched, and trip density by plant location
                </p>
              </div>
              <Link
                href="/reports"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                View Full Plant Reports <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Plant / Facility</th>
                    <th className="px-4 py-3 text-center">Trips</th>
                    <th className="px-4 py-3 text-right">Tonnage (KG)</th>
                    <th className="px-4 py-3 text-right">Volume (CBM)</th>
                    <th className="px-4 py-3 text-right">Total Freight Spend</th>
                    <th className="px-4 py-3 text-right bg-purple-50/50 text-purple-800 font-bold">Cost / KG</th>
                    <th className="px-4 py-3 text-right bg-indigo-50/50 text-indigo-800 font-bold">Cost / CBM</th>
                    <th className="px-4 py-3 text-right text-slate-800 font-bold">Cost / Trip</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {unitRatesMetrics.plantRatesList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-medium">
                        No plant delivery data for this month.
                      </td>
                    </tr>
                  ) : (
                    unitRatesMetrics.plantRatesList.map((p) => {
                      const isHighCost = p.ratePerKg > unitRatesMetrics.costPerKg * 1.25 && p.totalKg > 0;
                      const isOptimal = p.ratePerKg <= unitRatesMetrics.costPerKg && p.totalKg > 0;
                      return (
                        <tr key={p.plantCode} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {p.plantName}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-700">
                            {p.tripsCount}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {formatNumber(p.totalKg, 0)} KG
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {formatNumber(p.totalCbm, 2)} CBM
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800">
                            Rs. {formatNumber(p.totalSpend, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/30">
                            Rs. {formatNumber(p.ratePerKg, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                            Rs. {formatNumber(p.ratePerCbm, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            Rs. {formatNumber(p.ratePerTrip, 0)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isOptimal
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : isHighCost
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isOptimal ? 'Efficient' : isHighCost ? 'High Unit Cost' : 'Normal'}
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

          {/* Vehicle Category Rate Performance Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Vehicle Type Unit Economics Benchmark
                </h3>
                <p className="text-xs text-slate-500 font-normal">
                  Evaluating cost per KM, cost per trip, and freight cost per payload capacity by vehicle category
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Vehicle Category</th>
                    <th className="px-4 py-3 text-center">Trips Run</th>
                    <th className="px-4 py-3 text-right">Distance (KM)</th>
                    <th className="px-4 py-3 text-right">Total KG</th>
                    <th className="px-4 py-3 text-right">Total CBM</th>
                    <th className="px-4 py-3 text-right">Total Payout</th>
                    <th className="px-4 py-3 text-right bg-blue-50/50 text-blue-800 font-bold">Rate / KM</th>
                    <th className="px-4 py-3 text-right text-slate-800 font-bold">Rate / Trip</th>
                    <th className="px-4 py-3 text-right bg-purple-50/50 text-purple-800 font-bold">Rate / KG</th>
                    <th className="px-4 py-3 text-right bg-indigo-50/50 text-indigo-800 font-bold">Rate / CBM</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {unitRatesMetrics.vehicleCategoryList.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400 font-medium">
                        No vehicle operational records for this month.
                      </td>
                    </tr>
                  ) : (
                    unitRatesMetrics.vehicleCategoryList.map((vc) => (
                      <tr key={vc.category} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {vc.category}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          {vc.tripsCount}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatNumber(vc.totalKm, 1)} km
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatNumber(vc.totalKg, 0)} KG
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatNumber(vc.totalCbm, 1)} CBM
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          Rs. {formatNumber(vc.totalSpend, 2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700 bg-blue-50/30">
                          Rs. {formatNumber(vc.ratePerKm, 2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                          Rs. {formatNumber(vc.ratePerTrip, 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/30">
                          Rs. {formatNumber(vc.ratePerKg, 2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-700 bg-indigo-50/30">
                          Rs. {formatNumber(vc.ratePerCbm, 2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Strategic Decision Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-lg shadow-xs mt-0.5">
                <Lightbulb className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Executive Decision Insight: Unit Rate Optimization
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                  Our current company-wide freight rate is{' '}
                  <strong className="text-slate-800 font-semibold">
                    Rs. {formatNumber(unitRatesMetrics.costPerKg, 2)} per KG
                  </strong>{' '}
                  and{' '}
                  <strong className="text-slate-800 font-semibold">
                    Rs. {formatNumber(unitRatesMetrics.costPerTrip, 0)} per Trip
                  </strong>.
                  Consolidating small LTL orders into combined full truckloads reduces Per-KG freight cost by{' '}
                  <strong className="text-emerald-700 font-semibold">
                    Rs. {unitRatesMetrics.savingsPerKg.toFixed(2)} / KG
                  </strong>.
                  Prioritize batching orders destined for distant plant nodes to keep long-haul freight rates under target benchmarks.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 2: FLEET & CONTRACTS PERSPECTIVE             */}
      {/* ---------------------------------------------------- */}
      {subTab === 'fleet' && (
        <div className="space-y-4">
          {/* Sub-navigation mode toggle: All vs Fixed Fleet vs KM-Based Fleet */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="inline-flex bg-slate-100 p-1 rounded-lg space-x-1 flex-wrap gap-y-1">
              <button
                type="button"
                onClick={() => setFleetMode('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  fleetMode === 'all'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>All Fleet Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setFleetMode('fixed')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  fleetMode === 'fixed'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Fixed Fleet (Contract)</span>
                {fleetMetrics.overLimitFixedCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-extrabold">
                    {fleetMetrics.overLimitFixedCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFleetMode('km_based')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  fleetMode === 'km_based'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>KM-Based (Commercial)</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium px-2">
              Registered Fleet: <strong className="text-slate-800">{fleetMetrics.fixedCount + fleetMetrics.kmCount}</strong> vehicles ({fleetMetrics.fixedCount} Fixed Contract, {fleetMetrics.kmCount} KM-Based)
            </div>
          </div>

          {/* ==================================================== */}
          {/* MODE 1: ALL FLEET OVERVIEW                           */}
          {/* ==================================================== */}
          {fleetMode === 'all' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Fixed vs KM-Based Ratio
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      {fleetMetrics.fixedCount} Fixed / {fleetMetrics.kmCount} KM
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-2">
                      Fixed: Rs. {formatNumber(fleetMetrics.totalFixedSpend, 0)} | KM: Rs. {formatNumber(fleetMetrics.totalKmSpend, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Truck className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Fleet Active Utilization
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      {fleetMetrics.utilizationRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-2">
                      Active deployed vehicles this period
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Activity className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Contract Over-Run Alerts
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {fleetMetrics.contractBreachCount} Vehicles
                    </p>
                    <p className="text-xs text-red-600 font-medium mt-2">
                      Exceeded monthly free KM threshold
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Benchmark Diesel Rate
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      Rs. {dieselRate.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-2">
                      Monthly Ceylon Petroleum Index
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Fuel className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Comparative Fleet Model Performance (Fixed vs KM-Based)
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">
                    Macro comparison between contractual monthly rent vehicles and commercial on-demand fleet
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Operational Metric</th>
                        <th className="px-4 py-3 text-right bg-purple-50/60 text-purple-900">Fixed Fleet (Contract)</th>
                        <th className="px-4 py-3 text-right bg-emerald-50/60 text-emerald-900">KM-Based (Commercial)</th>
                        <th className="px-4 py-3 text-right text-slate-800">Combined Total / Avg</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 font-medium">
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-slate-800 font-semibold">Registered Vehicles</td>
                        <td className="px-4 py-3 text-right text-purple-700 font-bold">{fleetMetrics.fixedCount} Trucks</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-bold">{fleetMetrics.kmCount} Trucks</td>
                        <td className="px-4 py-3 text-right text-slate-800 font-bold">{fleetMetrics.fixedCount + fleetMetrics.kmCount} Trucks</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-slate-800 font-semibold">Total Mileage (KM)</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatNumber(fleetMetrics.totalFixedKm, 1)} km</td>
                        <td className="px-4 py-3 text-right text-slate-700">{formatNumber(fleetMetrics.totalKmDistance, 1)} km</td>
                        <td className="px-4 py-3 text-right text-slate-900 font-bold">{formatNumber(fleetMetrics.totalFixedKm + fleetMetrics.totalKmDistance, 1)} km</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-slate-800 font-semibold">Total Freight Spend</td>
                        <td className="px-4 py-3 text-right text-purple-700 font-bold">Rs. {formatNumber(fleetMetrics.totalFixedSpend, 2)}</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-bold">Rs. {formatNumber(fleetMetrics.totalKmSpend, 2)}</td>
                        <td className="px-4 py-3 text-right text-blue-700 font-bold">Rs. {formatNumber(fleetMetrics.totalFixedSpend + fleetMetrics.totalKmSpend, 2)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-slate-800 font-semibold">Effective Cost per KM</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-800 bg-purple-50/30">Rs. {formatNumber(fleetMetrics.avgFixedCostPerKm, 2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-800 bg-emerald-50/30">Rs. {formatNumber(fleetMetrics.avgKmCostPerKm, 2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          Rs. {formatNumber(
                            (fleetMetrics.totalFixedSpend + fleetMetrics.totalKmSpend) /
                            Math.max(1, fleetMetrics.totalFixedKm + fleetMetrics.totalKmDistance),
                            2
                          )}
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-slate-800 font-semibold">Core Cost Driver</td>
                        <td className="px-4 py-3 text-right text-slate-600">Monthly Base Rent ({((fleetMetrics.totalBaseRent / Math.max(1, fleetMetrics.totalFixedSpend)) * 100).toFixed(0)}%)</td>
                        <td className="px-4 py-3 text-right text-slate-600">Fuel & Running ({(( (fleetMetrics.totalKmFuelCost + fleetMetrics.totalKmRunningCost) / Math.max(1, fleetMetrics.totalKmSpend)) * 100).toFixed(0)}%)</td>
                        <td className="px-4 py-3 text-right text-slate-600">Blended Fleet Economics</td>
                      </tr>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 text-slate-800 font-semibold">Executive Priority</td>
                        <td className="px-4 py-3 text-right text-purple-700 font-bold">Maximize Free KM (Avoid Idle Loss)</td>
                        <td className="px-4 py-3 text-right text-emerald-700 font-bold">Combine Orders (Cut Variable KM)</td>
                        <td className="px-4 py-3 text-right text-blue-700 font-bold">Total Logistics Cost Minimization</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2 Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Fixed Fleet: Free Limit vs Actual Run KM
                      </h3>
                      <p className="text-xs text-slate-500 font-normal">Comparing contract quotas against actual distance</p>
                    </div>
                  </div>
                  <ChartCanvas
                    type="bar"
                    data={{
                      labels: fleetMetrics.fixedVehiclesList.slice(0, 8).map((v) => v.vehicleNumber),
                      datasets: [
                        {
                          label: 'Free KM Limit',
                          data: fleetMetrics.fixedVehiclesList.slice(0, 8).map((v) => v.limit),
                          backgroundColor: '#94a3b8',
                          borderRadius: 6,
                        },
                        {
                          label: 'Actual Run KM',
                          data: fleetMetrics.fixedVehiclesList.slice(0, 8).map((v) => v.actualKm),
                          backgroundColor: '#8b5cf6',
                          borderRadius: 6,
                        },
                      ],
                    }}
                  />
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Cost per KM Efficiency (Top Vehicles)
                      </h3>
                      <p className="text-xs text-slate-500 font-normal">LKR per KM comparison across fleet</p>
                    </div>
                  </div>
                  <ChartCanvas
                    type="bar"
                    data={{
                      labels: [...fleetMetrics.fixedVehiclesList, ...fleetMetrics.kmVehiclesList]
                        .filter((v) => v.costPerKm > 0)
                        .slice(0, 8)
                        .map((v) => v.vehicleNumber),
                      datasets: [
                        {
                          label: 'Cost per KM (LKR)',
                          data: [...fleetMetrics.fixedVehiclesList, ...fleetMetrics.kmVehiclesList]
                            .filter((v) => v.costPerKm > 0)
                            .slice(0, 8)
                            .map((v) => v.costPerKm),
                          backgroundColor: '#10b981',
                          borderRadius: 6,
                        },
                      ],
                    }}
                  />
                </div>
              </div>

              {/* Executive Recommendations */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-amber-100 text-amber-700 rounded-lg shadow-xs mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Procurement & Contract Strategy Insights
                    </h4>
                    <ul className="text-xs text-slate-600 mt-1.5 space-y-1 list-disc list-inside font-normal">
                      <li>
                        <strong className="text-slate-800">{fleetMetrics.contractBreachCount} fixed vehicles</strong> exceeded contract free KM thresholds, accumulating extra-KM penalties. Consider negotiating a higher base KM bracket.
                      </li>
                      <li>
                        <strong className="text-slate-800">{fleetMetrics.underUtilizedFixedCount} fixed vehicles</strong> ran below 50% of their free KM quota (est. rent under-utilization waste: <strong className="text-amber-700">Rs. {formatNumber(fleetMetrics.wastedRentEstimate, 0)}</strong>). Switch under-utilized vehicles to on-demand KM-based terms.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* MODE 2: FIXED FLEET (CONTRACT) PERFORMANCE CONSOLE   */}
          {/* ==================================================== */}
          {fleetMode === 'fixed' && (
            <div className="space-y-4">
              {/* 4 Cards for Fixed Fleet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-purple-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-purple-700 font-bold uppercase tracking-wider mb-1">
                      Total Fixed Fleet Spend
                    </p>
                    <p className="text-2xl font-bold text-purple-900">
                      Rs. {formatNumber(fleetMetrics.totalFixedSpend, 2)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Base: Rs. {formatNumber(fleetMetrics.totalBaseRent, 0)} | Extra: Rs. {formatNumber(fleetMetrics.totalExtraCharges, 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Avg Free KM Quota Used
                    </p>
                    <p className="text-2xl font-bold text-purple-700">
                      {fleetMetrics.avgFreeKmUsagePct.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Total Fixed Run: {formatNumber(fleetMetrics.totalFixedKm, 1)} KM
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Gauge className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Effective Cost / KM
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      Rs. {formatNumber(fleetMetrics.avgFixedCostPerKm, 2)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Contract rent amortized per KM
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Contract Health Status
                    </p>
                    <p className="text-xl font-bold text-slate-800">
                      <span className="text-emerald-700">{fleetMetrics.optimalFixedCount}</span> / <span className="text-amber-600">{fleetMetrics.underUtilizedFixedCount}</span> / <span className="text-red-600">{fleetMetrics.overLimitFixedCount}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Optimal / Under-Utilized / Over-Limit
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Free KM Utilization Progress Cards */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Fixed Fleet: Monthly Free KM Quota Utilization Gauges
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Tracks mileage consumed vs contract quota. Target utilization: 50% – 95%
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Optimal (50-95%)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Under-Utilized (&lt;50%)
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Over-Limit (&gt;100%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {fleetMetrics.fixedVehiclesList.map((fv) => {
                    const pct = fv.freeKmUsagePct;
                    const barPct = Math.min(100, pct);
                    let barColor = 'bg-emerald-500';
                    let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    if (pct > 100) {
                      barColor = 'bg-red-500';
                      badgeColor = 'bg-red-50 text-red-700 border-red-200';
                    } else if (pct < 50) {
                      barColor = 'bg-amber-500';
                      badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                    }

                    return (
                      <div key={fv.vehicleNumber} className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{fv.vehicleNumber}</span>
                            <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5 bg-white border border-slate-200 rounded">
                              {fv.type}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                            {pct.toFixed(1)}% Used
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2">
                          <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${barPct}%` }}></div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600">
                          <span>
                            Run: <strong className="text-slate-800">{formatNumber(fv.actualKm, 1)}</strong> / {formatNumber(fv.limit, 0)} KM
                          </span>
                          <span>
                            {fv.extraKm > 0 ? (
                              <span className="text-red-600 font-bold">
                                +{formatNumber(fv.extraKm, 1)} km (Surcharge: Rs. {formatNumber(fv.extraCharge, 0)})
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {formatNumber(Math.max(0, fv.limit - fv.actualKm), 0)} KM remaining
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fixed Fleet Detailed Matrix Table */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Fixed Contract Fleet Performance Matrix
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Full breakdown of monthly base rent, extra charges, and effective cost per kilometer
                    </p>
                  </div>
                  <Link
                    href="/reports"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <span>View in Reports Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Vehicle No</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-right">Base Rent</th>
                        <th className="px-4 py-3 text-right">Free Limit</th>
                        <th className="px-4 py-3 text-right">Actual Run</th>
                        <th className="px-4 py-3 text-center">Free KM %</th>
                        <th className="px-4 py-3 text-right">Extra KM</th>
                        <th className="px-4 py-3 text-right">Extra Charge</th>
                        <th className="px-4 py-3 text-right bg-purple-50/50 text-purple-900 font-bold">Total Payout</th>
                        <th className="px-4 py-3 text-right text-slate-800 font-bold">Cost / KM</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 font-medium">
                      {fleetMetrics.fixedVehiclesList.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-8 text-center text-slate-400 font-medium">
                            No fixed fleet vehicles found.
                          </td>
                        </tr>
                      ) : (
                        fleetMetrics.fixedVehiclesList.map((fv) => (
                          <tr key={fv.vehicleNumber} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{fv.vehicleNumber}</td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fv.type}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                              Rs. {formatNumber(fv.baseRent, 2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                              {formatNumber(fv.limit, 0)} km
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatNumber(fv.actualKm, 1)} km
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                fv.freeKmUsagePct > 100
                                  ? 'bg-red-50 text-red-700'
                                  : fv.freeKmUsagePct < 50
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}>
                                {fv.freeKmUsagePct.toFixed(1)}%
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                              fv.extraKm > 0 ? 'text-red-600' : 'text-slate-400'
                            }`}>
                              {fv.extraKm > 0 ? `+${formatNumber(fv.extraKm, 1)} km` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">
                              {fv.extraCharge > 0 ? `Rs. ${formatNumber(fv.extraCharge, 2)}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/30 whitespace-nowrap">
                              Rs. {formatNumber(fv.totalPayout, 2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              Rs. {formatNumber(fv.costPerKm, 2)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                fv.status === 'OVER_LIMIT'
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : fv.status === 'UNDER_UTILIZED'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : fv.status === 'IDLE'
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {fv.statusLabel}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fixed Fleet Managerial Callout */}
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-purple-100 text-purple-700 rounded-lg shadow-xs mt-0.5">
                    <Lightbulb className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                      Contract Negotiation & Fleet Right-Sizing Strategy
                    </h4>
                    <p className="text-xs text-purple-800 mt-1 leading-relaxed font-normal">
                      Vehicles running below 50% of their free limit cause effective Cost/KM to spike significantly above market rates.
                      Consider converting persistently under-utilized trucks into on-demand KM-based compensation.
                      For over-limit vehicles, renegotiate higher monthly free mileage tiers to avoid expensive extra-KM surcharges.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* MODE 3: KM-BASED (COMMERCIAL) EFFICIENCY CONSOLE     */}
          {/* ==================================================== */}
          {fleetMode === 'km_based' && (
            <div className="space-y-4">
              {/* 4 Cards for KM-Based Fleet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-emerald-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider mb-1">
                      Total Commercial Spend
                    </p>
                    <p className="text-2xl font-bold text-emerald-900">
                      Rs. {formatNumber(fleetMetrics.totalKmSpend, 2)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {fleetMetrics.kmVehiclesList.length} Commercial vehicles deployed
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                    <DollarSign className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Average Cost / KM
                    </p>
                    <p className="text-2xl font-bold text-emerald-700">
                      Rs. {formatNumber(fleetMetrics.avgKmCostPerKm, 2)}
                    </p>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Total KM: {formatNumber(fleetMetrics.totalKmDistance, 1)} km
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Fuel Expenditure
                    </p>
                    <p className="text-2xl font-bold text-amber-600">
                      Rs. {formatNumber(fleetMetrics.totalKmFuelCost, 2)}
                    </p>
                    <p className="text-xs text-amber-700 font-semibold mt-1">
                      {fleetMetrics.fuelSharePct.toFixed(1)}% of commercial spend
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Fuel className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
                  <div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                      Combine Order Savings
                    </p>
                    <p className="text-2xl font-bold text-blue-700">
                      Rs. {formatNumber(fleetMetrics.totalKmCombineSavings, 2)}
                    </p>
                    <p className="text-xs text-emerald-600 font-semibold mt-1">
                      Direct cash savings via consolidation
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                    <PiggyBank className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Variable Cost Breakdown Distribution */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 sm:p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  KM-Based Variable Cost Structure Distribution
                </h3>
                <p className="text-xs text-slate-500 font-normal mb-4">
                  Breakdown of operating costs paid to commercial transport providers per kilometer driven
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-amber-900">1. Fuel Consumption</span>
                      <span className="font-extrabold text-amber-800">{fleetMetrics.fuelSharePct.toFixed(1)}%</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      Rs. {formatNumber(fleetMetrics.totalKmFuelCost, 2)}
                    </p>
                    <div className="w-full bg-amber-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-amber-600 h-full rounded-full" style={{ width: `${Math.min(100, fleetMetrics.fuelSharePct)}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-blue-900">2. Running & Maint.</span>
                      <span className="font-extrabold text-blue-800">{fleetMetrics.runningSharePct.toFixed(1)}%</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      Rs. {formatNumber(fleetMetrics.totalKmRunningCost, 2)}
                    </p>
                    <div className="w-full bg-blue-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${Math.min(100, fleetMetrics.runningSharePct)}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-emerald-900">3. Driver Profit</span>
                      <span className="font-extrabold text-emerald-800">{fleetMetrics.driverProfitSharePct.toFixed(1)}%</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      Rs. {formatNumber(fleetMetrics.totalKmDriverProfit, 2)}
                    </p>
                    <div className="w-full bg-emerald-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, fleetMetrics.driverProfitSharePct)}%` }}></div>
                    </div>
                  </div>

                  <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-purple-900">4. Daily Allowance</span>
                      <span className="font-extrabold text-purple-800">{fleetMetrics.dailyFixedSharePct.toFixed(1)}%</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">
                      Rs. {formatNumber(fleetMetrics.totalKmDailyFixed, 2)}
                    </p>
                    <div className="w-full bg-purple-200 h-1.5 rounded-full overflow-hidden mt-2">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, fleetMetrics.dailyFixedSharePct)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* KM-Based Fleet Detailed Matrix Table */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Commercial On-Demand Fleet Performance Matrix
                    </h3>
                    <p className="text-xs text-slate-500 font-normal">
                      Individual vehicle mileage, fuel consumption, driver allowances, and combine order ROI
                    </p>
                  </div>
                  <Link
                    href="/reports"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <span>View in Reports Hub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[11px]">
                      <tr>
                        <th className="px-4 py-3 text-left">Vehicle No</th>
                        <th className="px-4 py-3 text-left">Type</th>
                        <th className="px-4 py-3 text-center">Trips</th>
                        <th className="px-4 py-3 text-right">Distance (KM)</th>
                        <th className="px-4 py-3 text-right">Fuel Rate</th>
                        <th className="px-4 py-3 text-right">Fuel Cost</th>
                        <th className="px-4 py-3 text-right">Running</th>
                        <th className="px-4 py-3 text-right">Driver Pay</th>
                        <th className="px-4 py-3 text-right">Day Fixed</th>
                        <th className="px-4 py-3 text-right bg-emerald-50/50 text-emerald-900 font-bold">Total Payout</th>
                        <th className="px-4 py-3 text-right text-slate-800 font-bold">Cost / KM</th>
                        <th className="px-4 py-3 text-right text-blue-700 font-bold">Combine Savings</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100 font-medium">
                      {fleetMetrics.kmVehiclesList.length === 0 ? (
                        <tr>
                          <td colSpan={12} className="px-4 py-8 text-center text-slate-400 font-medium">
                            No KM-based commercial vehicles found.
                          </td>
                        </tr>
                      ) : (
                        fleetMetrics.kmVehiclesList.map((kb) => (
                          <tr key={kb.vehicleNumber} className="hover:bg-slate-50/80 transition">
                            <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">{kb.vehicleNumber}</td>
                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{kb.type}</td>
                            <td className="px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">{kb.trips}</td>
                            <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                              {formatNumber(kb.actualKm, 1)} km
                            </td>
                            <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                              {kb.fuelConsumption} km/L
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(kb.fuelCost, 2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(kb.runningCost, 2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(kb.driverProfit, 2)}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                              Rs. {formatNumber(kb.dailyFixed, 2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50/30 whitespace-nowrap">
                              Rs. {formatNumber(kb.totalPayout, 2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              Rs. {formatNumber(kb.costPerKm, 2)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                              {kb.combineSavings > 0 ? `Rs. ${formatNumber(kb.combineSavings, 2)}` : '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* KM-Based Tactical Intelligence Callout */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shadow-xs mt-0.5">
                    <Lightbulb className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Commercial Freight Efficiency: Combine Load Batching
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed font-normal">
                      Every kilometer driven by commercial vehicles generates variable costs (Fuel + Maintenance + Driver Profit).
                      By routing multiple customer orders into consolidated multi-drop trips via the Combine Workbench, we have saved{' '}
                      <strong className="font-bold text-emerald-950">Rs. {formatNumber(fleetMetrics.totalKmCombineSavings, 2)}</strong> this period.
                      Focus dispatchers on keeping truck fill-rates high to drive down Cost/KM.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 3: PLANT LOGISTICS PERSPECTIVE               */}
      {/* ---------------------------------------------------- */}
      {subTab === 'plants' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Top Spending Plant
                </p>
                <p className="text-xl font-bold text-slate-800 truncate">
                  {plantMetrics.topPlant.name}
                </p>
                <p className="text-xs text-blue-600 font-medium mt-2">
                  Rs. {formatNumber(plantMetrics.topPlant.spend, 0)} freight spend
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <Building2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Active Facilities
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {plantMetrics.list.length} Facilities
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Manufacturing & logistics origins
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 shadow-xs">
                <Layers className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Total Cargo Tonnage
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatNumber(financialMetrics.totalKg / 1000, 1)} Tons
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  {formatNumber(financialMetrics.totalCbm, 1)} CBM total volume
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                <Scale className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Avg Plant Allocation
                </p>
                <p className="text-2xl font-bold text-purple-700">
                  Rs. {formatNumber(plantMetrics.list.length > 0 ? plantMetrics.totalPlantSpend / plantMetrics.list.length : 0, 0)}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Average freight expense per factory
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                <Boxes className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Plant Budget Consumption %
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">Freight share by plant</p>
                </div>
              </div>
              <ChartCanvas
                type="doughnut"
                data={{
                  labels: plantMetrics.list.map((p) => p.name),
                  datasets: [
                    {
                      data: plantMetrics.list.map((p) => p.spend),
                      backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'],
                    },
                  ],
                }}
              />
            </div>

            <div className="lg:col-span-2 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Plant Cargo Weight Dispatched
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">Comparing weight handled across facilities</p>
                </div>
              </div>
              <ChartCanvas
                type="bar"
                data={{
                  labels: plantMetrics.list.map((p) => p.name),
                  datasets: [
                    {
                      label: 'Cargo Weight (KG)',
                      data: plantMetrics.list.map((p) => p.kg),
                      backgroundColor: '#60a5fa',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shadow-xs mt-0.5">
                <Building2 className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Inter-Plant Cost Allocation & ERP Debit Notes
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                  Transport costs are calculated based on weight and volume share. Multi-stop trips automatically split vehicle fuel and running expenses among participating manufacturing units for internal cost-recovery accounting.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 4: ROUTE & NETWORK PERSPECTIVE               */}
      {/* ---------------------------------------------------- */}
      {subTab === 'routes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Active Corridors
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {routeMetrics.activeCorridorsCount} Routes
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Distinct transit routes operated
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <RouteIcon className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Top 5 Corridor Concentration
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {routeMetrics.totalRouteSpend > 0
                    ? ((routeMetrics.topRoutes.reduce((s, r) => s + r.spend, 0) / routeMetrics.totalRouteSpend) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-amber-600 font-medium mt-2">
                  Concentration of network budget
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                <Percent className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Total Route Mileage
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatNumber(financialMetrics.totalKm, 0)} KM
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Cumulative transit distance
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Average Trip Cost
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  Rs. {formatNumber(filteredTrips.length > 0 ? financialMetrics.totalTripCost / filteredTrips.length : 0, 0)}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Across {filteredTrips.length} completed trips
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Top 5 Most Expensive Corridors
                </h3>
                <p className="text-xs text-slate-500 font-normal">Highest expenditure routes in the logistics network</p>
              </div>
            </div>
            <ChartCanvas
              type="bar"
              data={{
                labels: routeMetrics.topRoutes.map((r) => r.routeName),
                datasets: [
                  {
                    label: 'Total Spend (LKR)',
                    data: routeMetrics.topRoutes.map((r) => r.spend),
                    backgroundColor: '#6366f1',
                    borderRadius: 6,
                  },
                ],
              }}
              options={{
                indexAxis: 'y',
              }}
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-lg shadow-xs mt-0.5">
                <RouteIcon className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Logistics Network Optimization Opportunity
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                  The top 5 arterial corridors account for over 50% of the entire transport budget. Establishing scheduled dedicated milk-run loops and back-haul cargo consolidation on these corridors will capture an estimated 15-20% further freight reduction.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SUB-TAB 5: DEMAND & SLA PERSPECTIVE                  */}
      {/* ---------------------------------------------------- */}
      {subTab === 'demand' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Request Fulfillment Rate
                </p>
                <p className="text-2xl font-bold text-emerald-700">
                  {demandMetrics.fulfillmentRate.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  {demandMetrics.fulfilledCount} of {demandMetrics.totalRequests} orders completed
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Consolidation Combine Rate
                </p>
                <p className="text-2xl font-bold text-blue-700">
                  {demandMetrics.combinedRatio.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Multi-drop consolidated dispatch
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
                <Boxes className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Total Dispatched Tonnage
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {formatNumber(financialMetrics.totalKg, 0)} KG
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Finished goods and raw materials
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-xs">
                <Scale className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-xs p-4 sm:p-5 border border-slate-200 flex items-center justify-between min-h-[110px]">
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Average Trip Density
                </p>
                <p className="text-2xl font-bold text-slate-800">
                  {filteredTrips.length > 0 ? (demandMetrics.totalRequests / filteredTrips.length).toFixed(2) : 0}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-2">
                  Requests per dispatched trip
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                <Activity className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Day-of-Week Demand Pattern
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">Weekly surge analysis for proactive fleet staging</p>
                </div>
              </div>
              <ChartCanvas
                type="bar"
                data={{
                  labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                  datasets: [
                    {
                      label: 'Requests Count',
                      data: demandMetrics.dayOfWeekCounts,
                      backgroundColor: '#3b82f6',
                      borderRadius: 6,
                    },
                  ],
                }}
              />
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Consolidation Efficiency
                  </h3>
                  <p className="text-xs text-slate-500 font-normal">Single request vs Combined multi-drop trips</p>
                </div>
              </div>
              <ChartCanvas
                type="doughnut"
                data={{
                  labels: ['Consolidated Combine Trips', 'Single Direct Trips'],
                  datasets: [
                    {
                      data: [
                        demandMetrics.combinedCount,
                        Math.max(0, demandMetrics.totalRequests - demandMetrics.combinedCount),
                      ],
                      backgroundColor: ['#10b981', '#94a3b8'],
                    },
                  ],
                }}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-teal-100 text-teal-700 rounded-lg shadow-xs mt-0.5">
                <Clock className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Capacity Planning & Peak Demand Insight
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed font-normal">
                  Demand surges occur primarily mid-week. Scheduling planned maintenance for fixed fleet vehicles on off-peak days ensures 100% vehicle availability and avoids expensive spot-market ad-hoc vehicle hires during peak demand.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
