'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Truck,
  Package,
  Calendar,
  Fuel,
  Wrench,
  TrendingUp,
  PiggyBank,
  Eye,
  EyeOff,
  Search,
  Download,
  Building2,
  Printer,
  MapPin,
  CheckCircle2,
  X,
  ExternalLink,
  Gauge,
  Scale,
  Boxes,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { CostCalculator } from '@/lib/cost-calculator';

interface ReportsHubClientProps {
  initialTrips: any[];
  initialRequests: any[];
  initialVehicles: any[];
  initialPlants: any[];
  dieselRate: number;
  currentMonth: string;
}

// Utility for exporting tables to CSV
function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function ReportsHubClient({
  initialTrips = [],
  initialRequests = [],
  initialVehicles = [],
  initialPlants = [],
  dieselRate = 382.0,
  currentMonth = '2026-09',
}: ReportsHubClientProps) {
  const [activeTab, setActiveTab] = useState<'cost' | 'fleet' | 'demand'>('cost');
  const [costSubTab, setCostSubTab] = useState<'trips' | 'requests' | 'statements' | 'plants' | 'fixed' | 'km_based'>('trips');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [standardRange, setStandardRange] = useState('this_month');
  const [showKpiCards, setShowKpiCards] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [selectedVehicleReport, setSelectedVehicleReport] = useState<any | null>(null);
  const [selectedPlantReport, setSelectedPlantReport] = useState<any | null>(null);
  const [selectedRequestCost, setSelectedRequestCost] = useState<any | null>(null);

  // Table container height responsiveness
  const tableContainerClass = showKpiCards
    ? 'overflow-x-auto border-t border-slate-200 max-h-[calc(100vh-235px)] min-h-[480px]'
    : 'overflow-x-auto border-t border-slate-200 max-h-[calc(100vh-140px)] min-h-[620px]';

  // ----------------------------------------------------
  // 1. DATA PROCESSING FOR COST ANALYSIS TAB
  // ----------------------------------------------------
  const monthTrips = useMemo(() => {
    return initialTrips.filter((t) => {
      if (!['COMPLETED', 'FINALIZED', 'CLOSED'].includes(t.status)) return false;
      const tripMonth = (t.createdAt || '').substring(0, 7);
      return !selectedMonth || tripMonth === selectedMonth;
    });
  }, [initialTrips, selectedMonth]);

  // Count trips per vehicle per day for proportional fixed cost
  const vehicleDayTripCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    monthTrips.forEach((t) => {
      const vId = String(t.vehicleId || t.vehicle?.id || 'unknown');
      const tripDate = (t.createdAt || '').substring(0, 10);
      if (!counts[vId]) counts[vId] = {};
      counts[vId][tripDate] = (counts[vId][tripDate] || 0) + 1;
    });
    return counts;
  }, [monthTrips]);

  // Process Cost Trips with exact CostCalculator formulas
  const tripCostDetails = useMemo(() => {
    return monthTrips.map((t) => {
      const v = t.vehicle || {};
      const vId = String(t.vehicleId || v.id || 'unknown');
      const tripDate = (t.createdAt || '').substring(0, 10);
      const km = Number(t.actualKm || t.plannedKm || 0);

      const dayTripsCount = vehicleDayTripCounts[vId]?.[tripDate] || 1;
      const workingDaysShare = dayTripsCount > 0 ? 1.0 / dayTripsCount : 1.0;

      const costComp = CostCalculator.calculateTripCost(km, v, dieselRate, workingDaysShare);

      // Linked requests
      const linkedReqs = (t.tripRequests || []).map((tr: any) => {
        const r = tr.request || {};
        return {
          id: r.id || tr.requestId,
          request_code: r.requestCode || `REQ-${r.id}`,
          requestCode: r.requestCode || `REQ-${r.id}`,
          required_cbm: Number(r.requiredCbm || 0),
          required_kg: Number(r.requiredKg || 0),
          item_description: r.itemDescription || '-',
          required_date: (r.requiredDate || '').substring(0, 10),
          plant_name: r.plant?.code || 'Plant',
          from_name: r.fromLocation?.locationName || '-',
          to_name: r.toLocation?.locationName || '-',
        };
      });

      const reqShares = CostCalculator.allocateRequestCostShare(costComp.total_trip_cost, linkedReqs);
      const savings = CostCalculator.calculateConsolidationSavings(costComp.total_trip_cost, v, linkedReqs, dieselRate);

      return {
        ...t,
        vehicle_number: v.vehicleNumber || 'Unknown',
        vehicle_type: v.vehicleType || 'Standard',
        payment_basis: v.paymentBasis || 'KM_BASED',
        driver_name: t.driver?.name || 'Assigned Driver',
        route_name: t.route?.routeName || 'Custom Route',
        calc_km: km,
        ...costComp,
        linked_requests: linkedReqs,
        request_shares: reqShares,
        consolidation_savings: savings,
      };
    });
  }, [monthTrips, vehicleDayTripCounts, dieselRate]);

  // Request-wise cost details
  const requestCostDetails = useMemo(() => {
    const list: any[] = [];
    tripCostDetails.forEach((t) => {
      (t.linked_requests || []).forEach((lr: any) => {
        const share = t.request_shares[lr.id] || { allocated_cost: 0, share_pct: 0 };
        list.push({
          request_id: lr.id,
          request_code: lr.request_code,
          plant_name: lr.plant_name,
          from_name: lr.from_name,
          to_name: lr.to_name,
          item_description: lr.item_description,
          cbm: lr.required_cbm,
          kg: lr.required_kg,
          required_date: lr.required_date,
          trip_no: t.tripNo || `TRIP-${t.id}`,
          trip_id: t.id,
          vehicle_number: t.vehicle_number,
          vehicle_type: t.vehicle_type,
          payment_basis: t.payment_basis,
          trip_km: t.calc_km,
          trip_total_cost: t.total_trip_cost,
          share_pct: share.share_pct,
          allocated_cost: share.allocated_cost,
        });
      });
    });
    return list;
  }, [tripCostDetails]);

  // Fixed Fleet Settlements
  const fixedFleetSettlements = useMemo(() => {
    const fixedVehs = initialVehicles.filter(
      (v) => v.paymentBasis === 'FIXED' || Number(v.monthlyFixedRate || 0) > 0
    );

    return fixedVehs.map((v) => {
      const vTrips = tripCostDetails.filter((t) => String(t.vehicleId || t.vehicle?.id) === String(v.id));
      const monthRunKm = vTrips.reduce((sum, t) => sum + Number(t.calc_km || 0), 0);
      const settle = CostCalculator.calculateFixedFleetSettlement(v, monthRunKm);
      return {
        ...v,
        vehicle_id: v.id,
        vehicle_number: v.vehicleNumber,
        vehicle_type: v.vehicleType,
        base_rent: settle.base_rent,
        km_limit: settle.km_limit,
        actual_km: settle.actual_km,
        extra_km: settle.extra_km,
        extra_km_rate: settle.extra_km_rate,
        extra_charge: settle.extra_charge,
        total_payout: settle.total_payout,
        trips: vTrips,
      };
    });
  }, [initialVehicles, tripCostDetails]);

  // KM-Based Vehicles Settlement / Performance [NEW SUB-TAB DATA]
  const kmBasedSettlements = useMemo(() => {
    const kmVehs = initialVehicles.filter(
      (v) => v.paymentBasis !== 'FIXED' && Number(v.monthlyFixedRate || 0) === 0
    );

    return kmVehs.map((v) => {
      const vTrips = tripCostDetails.filter((t) => String(t.vehicleId || t.vehicle?.id) === String(v.id));
      const totalKm = vTrips.reduce((sum, t) => sum + Number(t.calc_km || 0), 0);
      const fuelCost = vTrips.reduce((sum, t) => sum + Number(t.fuel_cost || 0), 0);
      const runningCost = vTrips.reduce((sum, t) => sum + Number(t.running_cost || 0), 0);
      const driverProfit = vTrips.reduce((sum, t) => sum + Number(t.driver_profit || 0), 0);
      const dailyFixed = vTrips.reduce((sum, t) => sum + Number(t.fixed_daily_cost || 0), 0);
      const totalPayout = vTrips.reduce((sum, t) => sum + Number(t.total_trip_cost || 0), 0);
      const avgCostPerKm = totalKm > 0 ? totalPayout / totalKm : 0;

      return {
        vehicle_id: v.id,
        vehicle_number: v.vehicleNumber,
        vehicle_type: v.vehicleType,
        fuel_consumption: Number(v.fuelConsumptionKml || 10),
        trip_count: vTrips.length,
        total_km: totalKm,
        fuel_cost: fuelCost,
        running_cost: runningCost,
        driver_profit: driverProfit,
        daily_fixed: dailyFixed,
        total_payout: totalPayout,
        avg_cost_per_km: avgCostPerKm,
        trips: vTrips,
      };
    });
  }, [initialVehicles, tripCostDetails]);

  // Vehicle-wise Monthly Statements (All vehicles)
  const vehicleStatements = useMemo(() => {
    return initialVehicles.map((v) => {
      const vTrips = tripCostDetails.filter((t) => String(t.vehicleId || t.vehicle?.id) === String(v.id));
      const vTotalKm = vTrips.reduce((sum, t) => sum + Number(t.calc_km || 0), 0);
      const vFuelCost = vTrips.reduce((sum, t) => sum + Number(t.fuel_cost || 0), 0);
      const vRunningCost = vTrips.reduce((sum, t) => sum + Number(t.running_cost || 0), 0);
      const vDriverProfit = vTrips.reduce((sum, t) => sum + Number(t.driver_profit || 0), 0);
      const vDailyFixed = vTrips.reduce((sum, t) => sum + Number(t.fixed_daily_cost || 0), 0);
      const vTotalTripCost = vTrips.reduce((sum, t) => sum + Number(t.total_trip_cost || 0), 0);

      let fixedSettle: any = null;
      if (v.paymentBasis === 'FIXED' || Number(v.monthlyFixedRate || 0) > 0) {
        fixedSettle = CostCalculator.calculateFixedFleetSettlement(v, vTotalKm);
      }

      const totalMonthPayout = (v.paymentBasis === 'FIXED' && fixedSettle) ? fixedSettle.total_payout : vTotalTripCost;

      return {
        vehicle_id: v.id,
        vehicle_number: v.vehicleNumber,
        vehicle_type: v.vehicleType,
        payment_basis: v.paymentBasis || 'KM_BASED',
        monthly_fixed_rate: Number(v.monthlyFixedRate || 0),
        monthly_km_limit: Number(v.monthlyKmLimit || 0),
        extra_km_rate: Number(v.extraKmRate || 0),
        trip_count: vTrips.length,
        total_km: vTotalKm,
        fuel_cost: vFuelCost,
        running_cost: vRunningCost,
        driver_profit: vDriverProfit,
        daily_fixed: vDailyFixed,
        total_trip_cost: vTotalTripCost,
        fixed_settlement: fixedSettle,
        total_payout: totalMonthPayout,
        trips: vTrips,
      };
    });
  }, [initialVehicles, tripCostDetails]);

  // Overall Financial KPIs
  const financials = useMemo(() => {
    let totalKmCost = 0;
    let totalFuelCost = 0;
    let totalRunningMaintenance = 0;
    let totalDriverProfit = 0;
    let totalDailyFixed = 0;
    let totalKmRunMonthly = 0;
    let totalConsolidationSavings = 0;
    let totalStandaloneCost = 0;

    tripCostDetails.forEach((t) => {
      totalKmRunMonthly += t.calc_km;
      totalConsolidationSavings += t.consolidation_savings?.net_savings || 0;
      totalStandaloneCost += t.consolidation_savings?.standalone_total_cost || 0;

      if (t.payment_basis === 'KM_BASED') {
        totalKmCost += t.total_trip_cost;
        totalFuelCost += t.fuel_cost;
        totalRunningMaintenance += t.running_cost;
        totalDriverProfit += t.driver_profit;
        totalDailyFixed += t.fixed_daily_cost;
      }
    });

    const totalFixedFleetCost = fixedFleetSettlements.reduce((sum, ff) => sum + ff.total_payout, 0);
    const grandTotalSpend = totalKmCost + totalFixedFleetCost;
    const avgCostPerKm = totalKmRunMonthly > 0 ? grandTotalSpend / totalKmRunMonthly : 0;

    return {
      totalKmCost,
      totalFuelCost,
      totalRunningMaintenance,
      totalDriverProfit,
      totalDailyFixed,
      totalKmRunMonthly,
      totalConsolidationSavings,
      totalStandaloneCost,
      totalFixedFleetCost,
      grandTotalSpend,
      avgCostPerKm,
    };
  }, [tripCostDetails, fixedFleetSettlements]);

  // Plant-wise Transport Cost Allocations
  const plantCostAllocations = useMemo(() => {
    const map: Record<string, any> = {};

    requestCostDetails.forEach((rc) => {
      const pName = rc.plant_name || 'Other Plants';
      if (!map[pName]) {
        map[pName] = {
          plant_name: pName,
          request_count: 0,
          total_cbm: 0,
          total_kg: 0,
          total_transport_cost: 0,
          requests: [],
        };
      }
      map[pName].request_count += 1;
      map[pName].total_cbm += rc.cbm;
      map[pName].total_kg += rc.kg;
      map[pName].total_transport_cost += rc.allocated_cost;
      map[pName].requests.push(rc);
    });

    const list = Object.values(map).map((pData) => {
      const pCost = pData.total_transport_cost;
      const pCbm = pData.total_cbm;
      const pKg = pData.total_kg;
      return {
        ...pData,
        cost_per_cbm: pCbm > 0 ? pCost / pCbm : 0,
        cost_per_kg: pKg > 0 ? pCost / pKg : 0,
        share_pct: financials.grandTotalSpend > 0 ? Number(((pCost / financials.grandTotalSpend) * 100).toFixed(1)) : 0,
      };
    });

    return list.sort((a, b) => b.total_transport_cost - a.total_transport_cost);
  }, [requestCostDetails, financials.grandTotalSpend]);

  // ----------------------------------------------------
  // 2. FLEET PERFORMANCE DATA (Tab 2)
  // ----------------------------------------------------
  const fleetData = useMemo(() => {
    const totalKm = initialTrips.reduce((sum, t) => sum + Number(t.plannedKm || t.actualKm || 0), 0);
    const totalTrips = initialTrips.length;
    const activeVehicles = new Set(initialTrips.map((t) => t.vehicleId).filter(Boolean)).size;

    const vehiclesSummary = initialVehicles.map((v) => {
      const vTrips = initialTrips.filter((t) => t.vehicleId === v.id);
      const vDist = vTrips.reduce((sum, t) => sum + Number(t.plannedKm || t.actualKm || 0), 0);
      return {
        vehicle_number: v.vehicleNumber,
        vehicle_type: v.vehicleType,
        payment_basis: v.paymentBasis || 'KM_BASED',
        trip_count: vTrips.length,
        total_km: vDist,
      };
    }).sort((a, b) => b.trip_count - a.trip_count);

    return { totalKm, totalTrips, activeVehicles, vehiclesSummary };
  }, [initialTrips, initialVehicles]);

  // ----------------------------------------------------
  // 3. REQUEST & DEMAND DATA (Tab 3)
  // ----------------------------------------------------
  const demandData = useMemo(() => {
    const totalRequests = initialRequests.length;
    const completedRequests = initialRequests.filter((r) => ['COMPLETED', 'FINALIZED', 'CLOSED'].includes(r.status)).length;
    const allocatedOrCompleted = initialRequests.filter((r) => ['ALLOCATED', 'COMPLETED', 'FINALIZED', 'CLOSED'].includes(r.status));
    const totalCbm = allocatedOrCompleted.reduce((sum, r) => sum + Number(r.requiredCbm || 0), 0);
    const totalKg = allocatedOrCompleted.reduce((sum, r) => sum + Number(r.requiredKg || 0), 0);

    const plantDemandMap: Record<string, any> = {};
    initialPlants.forEach((p) => {
      plantDemandMap[p.code] = {
        plant_name: p.code,
        total_requests: 0,
        total_cbm: 0,
        total_kg: 0,
        urgent_requests: 0,
        completed_requests: 0,
      };
    });

    initialRequests.forEach((r) => {
      const pCode = r.plant?.code || 'Unknown';
      if (!plantDemandMap[pCode]) {
        plantDemandMap[pCode] = {
          plant_name: pCode,
          total_requests: 0,
          total_cbm: 0,
          total_kg: 0,
          urgent_requests: 0,
          completed_requests: 0,
        };
      }
      plantDemandMap[pCode].total_requests += 1;
      plantDemandMap[pCode].total_cbm += Number(r.requiredCbm || 0);
      plantDemandMap[pCode].total_kg += Number(r.requiredKg || 0);
      if (['URGENT', 'CRITICAL'].includes(r.urgency?.toUpperCase())) {
        plantDemandMap[pCode].urgent_requests += 1;
      }
      if (['COMPLETED', 'FINALIZED', 'CLOSED'].includes(r.status)) {
        plantDemandMap[pCode].completed_requests += 1;
      }
    });

    return {
      totalRequests,
      completedRequests,
      totalCbm,
      totalKg,
      plantDemandSummary: Object.values(plantDemandMap).sort((a, b) => b.total_requests - a.total_requests),
    };
  }, [initialRequests, initialPlants]);

  // ----------------------------------------------------
  // SEARCH FILTERING HELPERS
  // ----------------------------------------------------
  const filteredTripCosts = useMemo(() => {
    if (!searchQuery.trim()) return tripCostDetails;
    const q = searchQuery.toLowerCase();
    return tripCostDetails.filter(
      (t) =>
        t.tripNo?.toLowerCase().includes(q) ||
        t.vehicle_number?.toLowerCase().includes(q) ||
        t.driver_name?.toLowerCase().includes(q) ||
        t.route_name?.toLowerCase().includes(q)
    );
  }, [tripCostDetails, searchQuery]);

  const filteredRequestCosts = useMemo(() => {
    if (!searchQuery.trim()) return requestCostDetails;
    const q = searchQuery.toLowerCase();
    return requestCostDetails.filter(
      (rc) =>
        rc.request_code?.toLowerCase().includes(q) ||
        rc.plant_name?.toLowerCase().includes(q) ||
        rc.from_name?.toLowerCase().includes(q) ||
        rc.to_name?.toLowerCase().includes(q) ||
        rc.trip_no?.toLowerCase().includes(q) ||
        rc.vehicle_number?.toLowerCase().includes(q)
    );
  }, [requestCostDetails, searchQuery]);

  const filteredVehicleStatements = useMemo(() => {
    if (!searchQuery.trim()) return vehicleStatements;
    const q = searchQuery.toLowerCase();
    return vehicleStatements.filter(
      (vs) =>
        vs.vehicle_number?.toLowerCase().includes(q) ||
        vs.vehicle_type?.toLowerCase().includes(q) ||
        vs.payment_basis?.toLowerCase().includes(q)
    );
  }, [vehicleStatements, searchQuery]);

  const filteredPlantAllocations = useMemo(() => {
    if (!searchQuery.trim()) return plantCostAllocations;
    const q = searchQuery.toLowerCase();
    return plantCostAllocations.filter((pca) => pca.plant_name?.toLowerCase().includes(q));
  }, [plantCostAllocations, searchQuery]);

  const filteredFixedFleet = useMemo(() => {
    if (!searchQuery.trim()) return fixedFleetSettlements;
    const q = searchQuery.toLowerCase();
    return fixedFleetSettlements.filter(
      (ff) => ff.vehicle_number?.toLowerCase().includes(q) || ff.vehicle_type?.toLowerCase().includes(q)
    );
  }, [fixedFleetSettlements, searchQuery]);

  const filteredKmBased = useMemo(() => {
    if (!searchQuery.trim()) return kmBasedSettlements;
    const q = searchQuery.toLowerCase();
    return kmBasedSettlements.filter(
      (kb) => kb.vehicle_number?.toLowerCase().includes(q) || kb.vehicle_type?.toLowerCase().includes(q)
    );
  }, [kmBasedSettlements, searchQuery]);

  // Export handlers
  const handleExportCurrentTable = () => {
    if (activeTab === 'cost') {
      if (costSubTab === 'trips') {
        const headers = [
          'Trip No',
          'Date',
          'Vehicle No',
          'Vehicle Type',
          'Driver',
          'Route',
          'Run KM',
          'Fuel Rate (km/L)',
          'Fuel Cost (Rs.)',
          'Running Cost (Rs.)',
          'Driver Profit (Rs.)',
          'Day Fixed (Rs.)',
          'Total Trip Cost (Rs.)',
          'Combine Savings (Rs.)',
          'Linked Requests',
        ];
        const rows = filteredTripCosts.map((t) => [
          t.tripNo || `TRIP-${t.id}`,
          (t.createdAt || '').substring(0, 10),
          t.vehicle_number,
          t.vehicle_type,
          t.driver_name,
          t.route_name,
          t.calc_km.toFixed(1),
          t.fuel_consumption,
          t.fuel_cost.toFixed(2),
          t.running_cost.toFixed(2),
          t.driver_profit.toFixed(2),
          t.fixed_daily_cost.toFixed(2),
          t.total_trip_cost.toFixed(2),
          t.consolidation_savings?.net_savings?.toFixed(2) || '0.00',
          (t.linked_requests || []).map((lr: any) => lr.request_code).join('; '),
        ]);
        exportToCsv(`Trip_Costs_${selectedMonth}`, headers, rows);
      } else if (costSubTab === 'requests') {
        const headers = [
          'Request Code',
          'Required Date',
          'Plant',
          'From',
          'To',
          'Item Description',
          'Weight (KG)',
          'Trip No',
          'Vehicle',
          'Share %',
          'Attributed Cost (Rs.)',
        ];
        const rows = filteredRequestCosts.map((rc) => [
          rc.request_code,
          rc.required_date,
          rc.plant_name,
          rc.from_name,
          rc.to_name,
          rc.item_description,
          rc.kg.toFixed(0),
          rc.trip_no,
          rc.vehicle_number,
          rc.share_pct + '%',
          rc.allocated_cost.toFixed(2),
        ]);
        exportToCsv(`Cost_Share_${selectedMonth}`, headers, rows);
      } else if (costSubTab === 'statements') {
        const headers = [
          'Vehicle Number',
          'Type',
          'Payment Basis',
          'Trips',
          'Run KM',
          'Fuel Cost (Rs.)',
          'Running & Driver (Rs.)',
          'Fixed / Rent (Rs.)',
          'Total Month Payout (Rs.)',
        ];
        const rows = filteredVehicleStatements.map((vs) => [
          vs.vehicle_number,
          vs.vehicle_type,
          vs.payment_basis,
          vs.trip_count,
          vs.total_km.toFixed(1),
          vs.fuel_cost.toFixed(2),
          (vs.running_cost + vs.driver_profit).toFixed(2),
          vs.payment_basis === 'FIXED'
            ? vs.fixed_settlement?.base_rent?.toFixed(2) || '0.00'
            : vs.daily_fixed.toFixed(2),
          vs.total_payout.toFixed(2),
        ]);
        exportToCsv(`Vehicle_Statements_${selectedMonth}`, headers, rows);
      } else if (costSubTab === 'plants') {
        const headers = [
          'Plant / Origin',
          'Total Deliveries',
          'Volume (CBM)',
          'Weight (KG)',
          'Total Transport Cost (Rs.)',
          'Avg Cost / CBM (Rs.)',
          'Avg Cost / KG (Rs.)',
          'Cost Share %',
        ];
        const rows = filteredPlantAllocations.map((pca) => [
          pca.plant_name,
          pca.request_count,
          pca.total_cbm.toFixed(2),
          pca.total_kg.toFixed(0),
          pca.total_transport_cost.toFixed(2),
          pca.cost_per_cbm.toFixed(2),
          pca.cost_per_kg.toFixed(2),
          pca.share_pct + '%',
        ]);
        exportToCsv(`Plant_Allocations_${selectedMonth}`, headers, rows);
      } else if (costSubTab === 'fixed') {
        const headers = [
          'Vehicle Number',
          'Vehicle Type',
          'Monthly Base Rent (Rs.)',
          'Free KM Limit (km)',
          'Actual Run KM (km)',
          'Extra KM (km)',
          'Extra KM Rate (Rs.)',
          'Extra Charge (Rs.)',
          'Total Monthly Payout (Rs.)',
        ];
        const rows = filteredFixedFleet.map((ff) => [
          ff.vehicle_number,
          ff.vehicle_type,
          ff.base_rent.toFixed(2),
          ff.km_limit,
          ff.actual_km.toFixed(1),
          ff.extra_km > 0 ? ff.extra_km.toFixed(1) : 0,
          ff.extra_km_rate.toFixed(2),
          ff.extra_charge.toFixed(2),
          ff.total_payout.toFixed(2),
        ]);
        exportToCsv(`Fixed_Fleet_${selectedMonth}`, headers, rows);
      } else if (costSubTab === 'km_based') {
        const headers = [
          'Vehicle Number',
          'Vehicle Type',
          'Trips Run',
          'Total Run KM',
          'Fuel Consumption (km/L)',
          'Fuel Cost (Rs.)',
          'Running & Maint. (Rs.)',
          'Driver Profit (Rs.)',
          'Daily Fixed (Rs.)',
          'Total Month Payout (Rs.)',
          'Avg Cost / KM (Rs.)',
        ];
        const rows = filteredKmBased.map((kb) => [
          kb.vehicle_number,
          kb.vehicle_type,
          kb.trip_count,
          kb.total_km.toFixed(1),
          kb.fuel_consumption,
          kb.fuel_cost.toFixed(2),
          kb.running_cost.toFixed(2),
          kb.driver_profit.toFixed(2),
          kb.daily_fixed.toFixed(2),
          kb.total_payout.toFixed(2),
          kb.avg_cost_per_km.toFixed(2),
        ]);
        exportToCsv(`KM_Based_Vehicles_${selectedMonth}`, headers, rows);
      }
    } else if (activeTab === 'fleet') {
      const headers = ['Vehicle Number', 'Vehicle Type', 'Payment Basis', 'Total Trips', 'Distance (KM)', 'Status'];
      const rows = fleetData.vehiclesSummary.map((v) => [
        v.vehicle_number,
        v.vehicle_type,
        v.payment_basis,
        v.trip_count,
        v.total_km.toFixed(1),
        v.trip_count > 0 ? 'Active' : 'Idle',
      ]);
      exportToCsv('Fleet_Performance_Report', headers, rows);
    } else if (activeTab === 'demand') {
      const headers = ['Plant', 'Total Requests', 'Volume (CBM)', 'Weight (KG)', 'Urgent Requests', 'Completed Requests'];
      const rows = demandData.plantDemandSummary.map((p) => [
        p.plant_name,
        p.total_requests,
        p.total_cbm.toFixed(2),
        p.total_kg.toFixed(0),
        p.urgent_requests,
        p.completed_requests,
      ]);
      exportToCsv('Plant_Transport_Demand_Report', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* TOP FILTER AND NAVIGATION BAR                        */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        {/* Main Tabs */}
        <div className="inline-flex bg-slate-100 p-1 rounded-lg space-x-1">
          <button
            onClick={() => setActiveTab('cost')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center ${
              activeTab === 'cost' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <DollarSign className="w-4 h-4 mr-1.5" /> Cost Analysis & Reports
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center ${
              activeTab === 'fleet' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Truck className="w-4 h-4 mr-1.5" /> Fleet Performance
          </button>
          <button
            onClick={() => setActiveTab('demand')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition flex items-center ${
              activeTab === 'demand' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Package className="w-4 h-4 mr-1.5" /> Request & Demand
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {activeTab === 'cost' ? (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Period:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none shadow-xs font-semibold text-slate-800 bg-white"
              />
              <span className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                <Fuel className="w-3.5 h-3.5 mr-1.5 text-amber-600" /> Diesel: Rs. {dieselRate.toFixed(2)}
              </span>
              <Link
                href="/fuel-rates"
                className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition shadow-xs"
                title="Manage Monthly Fuel Rates"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Period:</label>
              <select
                value={standardRange}
                onChange={(e) => setStandardRange(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-w-[130px] shadow-xs font-semibold text-slate-700 bg-white"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
                <option value="this_year">This Year</option>
                <option value="all_time">All Time</option>
              </select>
            </div>
          )}

          {/* Toggle KPI Cards Visibility */}
          <button
            type="button"
            onClick={() => setShowKpiCards((prev) => !prev)}
            className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition shadow-xs"
            title="Hide/Unhide Summary Cards"
          >
            {showKpiCards ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: FINANCIAL & COST ANALYSIS                     */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'cost' && (
        <div className="space-y-6">
          {/* Cost KPI Cards (5 Cards matching PHP) */}
          {showKpiCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 transition-all duration-300">
              {/* Total Spend */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Spend</p>
                  <p className="text-base xl:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Rs. {formatNumber(financials.grandTotalSpend, 2)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
                    KM: Rs. {formatNumber(financials.totalKmCost, 0)} | Fixed: Rs. {formatNumber(financials.totalFixedFleetCost, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              {/* Total Fuel Cost */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Fuel Cost</p>
                  <p className="text-base xl:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Rs. {formatNumber(financials.totalFuelCost, 2)}
                  </p>
                  <p className="text-[11px] text-amber-600 mt-1 font-semibold truncate">
                    {financials.grandTotalSpend > 0
                      ? ((financials.totalFuelCost / financials.grandTotalSpend) * 100).toFixed(1)
                      : 0}
                    % of spend
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <Fuel className="w-5 h-5" />
                </div>
              </div>

              {/* Maintenance & Driver Pay */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Maintenance & Pay</p>
                  <p className="text-base xl:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Rs. {formatNumber(financials.totalRunningMaintenance + financials.totalDriverProfit, 2)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
                    Fixed Day: Rs. {formatNumber(financials.totalDailyFixed, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
              </div>

              {/* Avg Cost / Run KM */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Cost / Run KM</p>
                  <p className="text-base xl:text-lg font-bold text-slate-900 tracking-tight truncate">
                    Rs. {formatNumber(financials.avgCostPerKm, 2)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 font-medium truncate">
                    Total {formatNumber(financials.totalKmRunMonthly, 1)} KM
                  </p>
                </div>
                <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* Combine Savings */}
              <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">Combine Savings</p>
                  <p className="text-base xl:text-lg font-bold text-emerald-700 tracking-tight truncate">
                    Rs. {formatNumber(financials.totalConsolidationSavings, 2)}
                  </p>
                  <p className="text-[11px] text-emerald-600 mt-1 font-semibold truncate">
                    {financials.totalStandaloneCost > 0
                      ? ((financials.totalConsolidationSavings / financials.totalStandaloneCost) * 100).toFixed(1)
                      : 0}
                    % saved via combine
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                  <PiggyBank className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Main Sub Navigation & Tables Container */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            {/* 6 Sub Tabs Bar */}
            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white">
              <div className="inline-flex bg-slate-100 p-1 rounded-lg space-x-1 flex-wrap gap-y-1">
                <button
                  onClick={() => setCostSubTab('trips')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center whitespace-nowrap ${
                    costSubTab === 'trips'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> Trip Costs
                </button>
                <button
                  onClick={() => setCostSubTab('requests')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center whitespace-nowrap ${
                    costSubTab === 'requests'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Package className="w-3.5 h-3.5 mr-1.5" /> Cost Share
                </button>
                <button
                  onClick={() => setCostSubTab('statements')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center whitespace-nowrap ${
                    costSubTab === 'statements'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> Vehicle Statement
                </button>
                <button
                  onClick={() => setCostSubTab('plants')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center whitespace-nowrap ${
                    costSubTab === 'plants'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 mr-1.5" /> Plant Allocation
                </button>
                <button
                  onClick={() => setCostSubTab('fixed')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center whitespace-nowrap ${
                    costSubTab === 'fixed'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" /> Fixed Fleet
                </button>
                <button
                  onClick={() => setCostSubTab('km_based')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center whitespace-nowrap ${
                    costSubTab === 'km_based'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 mr-1.5" /> KM Based
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search records..."
                    className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleExportCurrentTable}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center shadow-xs whitespace-nowrap"
                >
                  <Download className="w-4 h-4 mr-1.5" /> Export Excel
                </button>
              </div>
            </div>

            {/* -------------------------------------------------- */}
            {/* SUB-TAB 1: TRIP-WISE COST BREAKDOWN (15 Columns)  */}
            {/* -------------------------------------------------- */}
            {costSubTab === 'trips' && (
              <div className={tableContainerClass}>
                <table className="min-w-[1550px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Trip No</th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Date</th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle No</th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle Type</th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Driver</th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Route</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Run KM</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Fuel Rate (km/L)</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Fuel Cost</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Running Cost</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Driver Profit</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Day Fixed</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Total Trip Cost</th>
                      <th className="px-3.5 py-3 text-right whitespace-nowrap bg-slate-50">Combine Savings</th>
                      <th className="px-3.5 py-3 text-left whitespace-nowrap bg-slate-50">Linked Requests</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {filteredTripCosts.length === 0 ? (
                      <tr>
                        <td colSpan={15} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap font-medium">
                          No completed trip costs recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredTripCosts.map((t) => {
                        const savings = t.consolidation_savings || { net_savings: 0, savings_pct: 0 };
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition">
                            <td className="px-3.5 py-3 font-semibold text-blue-600 whitespace-nowrap">
                              <Link
                                href={`/allocations/fg/combine/${t.id}`}
                                className="hover:underline inline-flex items-center gap-1"
                              >
                                {t.tripNo || `TRIP-${t.id}`}
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </Link>
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                              {(t.createdAt || '').substring(0, 10)}
                            </td>
                            <td className="px-3.5 py-3 font-bold text-slate-900 whitespace-nowrap">
                              {t.vehicle_number}
                            </td>
                            <td className="px-3.5 py-3 text-slate-600 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                                {t.vehicle_type}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                              {t.driver_name}
                            </td>
                            <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap font-medium">
                              {t.route_name}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                              {t.calc_km.toFixed(1)} km
                            </td>
                            <td className="px-3.5 py-3 text-right text-slate-600 whitespace-nowrap">
                              {t.fuel_consumption} km/L
                            </td>
                            <td className="px-3.5 py-3 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(t.fuel_cost, 2)}
                            </td>
                            <td className="px-3.5 py-3 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(t.running_cost, 2)}
                            </td>
                            <td className="px-3.5 py-3 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(t.driver_profit, 2)}
                            </td>
                            <td className="px-3.5 py-3 text-right text-slate-500 whitespace-nowrap">
                              Rs. {formatNumber(t.fixed_daily_cost, 2)}
                            </td>
                            <td className="px-3.5 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                              Rs. {formatNumber(t.total_trip_cost, 2)}
                            </td>
                            <td className="px-3.5 py-3 text-right whitespace-nowrap">
                              {(savings.net_savings || 0) > 0 ? (
                                <>
                                  <span className="font-bold text-emerald-700">
                                    Rs. {formatNumber(savings.net_savings, 2)}
                                  </span>{' '}
                                  <span className="text-[10px] text-emerald-600 font-semibold">
                                    ({savings.savings_pct}%)
                                  </span>
                                </>
                              ) : (
                                <span className="text-slate-400 font-normal">-</span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 flex-nowrap">
                                {(t.linked_requests || []).map((lr: any) => {
                                  const reqShare = t.request_shares[lr.id] || { allocated_cost: 0 };
                                  return (
                                    <button
                                      key={lr.id}
                                      type="button"
                                      onClick={() =>
                                        setSelectedRequestCost({
                                          ...lr,
                                          trip_no: t.tripNo || `TRIP-${t.id}`,
                                          vehicle_number: t.vehicle_number,
                                          allocated_cost: reqShare.allocated_cost,
                                        })
                                      }
                                      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition border border-slate-200 whitespace-nowrap"
                                    >
                                      {lr.request_code}
                                      <span className="text-[10px] text-emerald-700 ml-1 font-bold">
                                        Rs. {formatNumber(reqShare.allocated_cost, 0)}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* SUB-TAB 2: DELIVERY COST SHARE (10 Columns)       */}
            {/* -------------------------------------------------- */}
            {costSubTab === 'requests' && (
              <div className={tableContainerClass}>
                <table className="min-w-[1250px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Request Code</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Required Date</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Plant</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">From - To</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Item Description</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Weight (KG)</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Trip No</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Share %</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Attributed Cost</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {filteredRequestCosts.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap font-medium">
                          No delivery request costs found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredRequestCosts.map((rc, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-semibold text-blue-600 whitespace-nowrap">
                            {rc.request_code}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {rc.required_date}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px]">
                              {rc.plant_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {rc.from_name} <span className="text-slate-400 mx-1">→</span> {rc.to_name}
                          </td>
                          <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap max-w-[220px] truncate" title={rc.item_description}>
                            {rc.item_description}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-800 whitespace-nowrap">
                            {formatNumber(rc.kg, 0)} KG
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                            {rc.trip_no}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                            {rc.vehicle_number}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                              {rc.share_pct}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                            Rs. {formatNumber(rc.allocated_cost, 2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* SUB-TAB 3: VEHICLE STATEMENT (10 Columns)         */}
            {/* -------------------------------------------------- */}
            {costSubTab === 'statements' && (
              <div className={tableContainerClass}>
                <table className="min-w-[1250px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle Number</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Type</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Payment Basis</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Trips</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Run KM</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Fuel Cost</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Running & Driver</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Fixed / Rent</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Total Month Payout</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {filteredVehicleStatements.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap font-medium">
                          No vehicles found.
                        </td>
                      </tr>
                    ) : (
                      filteredVehicleStatements.map((vs) => (
                        <tr key={vs.vehicle_id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                            {vs.vehicle_number}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {vs.vehicle_type}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                                vs.payment_basis === 'FIXED'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {vs.payment_basis === 'FIXED' ? 'FIXED' : 'KM-BASED'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800 whitespace-nowrap">
                            {vs.trip_count}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {vs.total_km.toFixed(1)} km
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                            Rs. {formatNumber(vs.fuel_cost, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                            Rs. {formatNumber(vs.running_cost + vs.driver_profit, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                            {vs.payment_basis === 'FIXED'
                              ? `Rs. ${formatNumber(vs.fixed_settlement?.base_rent || 0, 2)}`
                              : `Rs. ${formatNumber(vs.daily_fixed, 2)}`}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                            Rs. {formatNumber(vs.total_payout, 2)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedVehicleReport(vs)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" /> Full Report
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* SUB-TAB 4: PLANT ALLOCATION (9 Columns)            */}
            {/* -------------------------------------------------- */}
            {costSubTab === 'plants' && (
              <div className={tableContainerClass}>
                <table className="min-w-[1250px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Plant / Origin</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Total Deliveries</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Volume (CBM)</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Weight (KG)</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Total Transport Cost</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Avg Cost / CBM</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Avg Cost / KG</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Cost Share %</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {filteredPlantAllocations.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap font-medium">
                          No plant cost records for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredPlantAllocations.map((pca) => (
                        <tr key={pca.plant_name} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPlantReport(pca)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded font-bold transition flex items-center gap-1.5"
                            >
                              <Building2 className="w-3.5 h-3.5" />
                              {pca.plant_name}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                            {pca.request_count} requests
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                            {formatNumber(pca.total_cbm, 2)} CBM
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                            {formatNumber(pca.total_kg, 0)} KG
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                            Rs. {formatNumber(pca.total_transport_cost, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            Rs. {formatNumber(pca.cost_per_cbm, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            Rs. {formatNumber(pca.cost_per_kg, 2)}
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-bold text-slate-700">{pca.share_pct}%</span>
                              <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-blue-600 h-full rounded-full"
                                  style={{ width: `${Math.min(100, pca.share_pct)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedPlantReport(pca)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 transition shadow-xs"
                            >
                              <FileText className="w-3.5 h-3.5" /> Full Report
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* SUB-TAB 5: FIXED FLEET (9 Columns)                 */}
            {/* -------------------------------------------------- */}
            {costSubTab === 'fixed' && (
              <div className={tableContainerClass}>
                <table className="min-w-[1250px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle Number</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle Type</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Monthly Base Rent</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Free KM Limit</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Actual Run KM</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Extra KM</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Extra KM Rate</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Extra Charge</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Total Monthly Payout</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {filteredFixedFleet.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap font-medium">
                          No fixed fleet contract vehicles registered.
                        </td>
                      </tr>
                    ) : (
                      filteredFixedFleet.map((ff) => (
                        <tr key={ff.vehicle_id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                            {ff.vehicle_number}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {ff.vehicle_type}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800 whitespace-nowrap">
                            Rs. {formatNumber(ff.base_rent, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                            {formatNumber(ff.km_limit, 0)} km
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatNumber(ff.actual_km, 1)} km
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                              ff.extra_km > 0 ? 'text-red-600' : 'text-slate-400'
                            }`}
                          >
                            {ff.extra_km > 0 ? `+${formatNumber(ff.extra_km, 1)} km` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                            Rs. {formatNumber(ff.extra_km_rate, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-red-600 whitespace-nowrap">
                            {ff.extra_charge > 0 ? `Rs. ${formatNumber(ff.extra_charge, 2)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-purple-700 whitespace-nowrap">
                            Rs. {formatNumber(ff.total_payout, 2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* -------------------------------------------------- */}
            {/* SUB-TAB 6: KM BASED (NEW) (11 Columns)            */}
            {/* -------------------------------------------------- */}
            {costSubTab === 'km_based' && (
              <div className={tableContainerClass}>
                <table className="min-w-[1350px] w-full divide-y divide-slate-200">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider font-bold shadow-xs">
                    <tr>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle Number</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap bg-slate-50">Vehicle Type</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap bg-slate-50">Trips Run</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Total Run KM</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Fuel Consumption</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Fuel Cost</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Running & Maint.</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Driver Profit</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Daily Fixed</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Total Month Payout</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap bg-slate-50">Avg Cost / KM</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs">
                    {filteredKmBased.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-12 text-center text-slate-400 whitespace-nowrap font-medium">
                          No KM-based commercial fleet vehicles found.
                        </td>
                      </tr>
                    ) : (
                      filteredKmBased.map((kb) => (
                        <tr key={kb.vehicle_id} className="hover:bg-slate-50/80 transition">
                          <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                            {kb.vehicle_number}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {kb.vehicle_type}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-800 whitespace-nowrap">
                            {kb.trip_count}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            {formatNumber(kb.total_km, 1)} km
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                            {kb.fuel_consumption} km/L
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                            Rs. {formatNumber(kb.fuel_cost, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                            Rs. {formatNumber(kb.running_cost, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                            Rs. {formatNumber(kb.driver_profit, 2)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                            Rs. {formatNumber(kb.daily_fixed, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-blue-700 whitespace-nowrap">
                            Rs. {formatNumber(kb.total_payout, 2)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                            Rs. {formatNumber(kb.avg_cost_per_km, 2)}
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
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: FLEET PERFORMANCE VIEW                        */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          {/* Fleet KPI Cards */}
          {showKpiCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transition-all duration-300">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Distance</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(fleetData.totalKm, 1)} <span className="text-xs font-semibold text-slate-400">KM</span>
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Trips</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(fleetData.totalTrips, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Active Vehicles</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(fleetData.activeVehicles, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Trips / Vehicle</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {fleetData.activeVehicles > 0
                      ? (fleetData.totalTrips / fleetData.activeVehicles).toFixed(1)
                      : 0}
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Vehicle Utilization Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Vehicle Utilization & Fleet Activity</h3>
                <p className="text-xs text-slate-500">Trip dispatch frequency, mileage, and active operational status per registered vehicle</p>
              </div>
              <button
                onClick={handleExportCurrentTable}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center shadow-xs whitespace-nowrap self-start md:self-auto"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export Excel
              </button>
            </div>

            <div className={tableContainerClass}>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold shadow-xs">
                  <tr>
                    <th className="px-4 py-3 text-left bg-slate-50 whitespace-nowrap">Vehicle Number</th>
                    <th className="px-4 py-3 text-left bg-slate-50 whitespace-nowrap">Vehicle Type</th>
                    <th className="px-4 py-3 text-left bg-slate-50 whitespace-nowrap">Payment Basis</th>
                    <th className="px-4 py-3 text-center bg-slate-50 whitespace-nowrap">Total Trips</th>
                    <th className="px-4 py-3 text-right bg-slate-50 whitespace-nowrap">Distance (KM)</th>
                    <th className="px-4 py-3 text-center bg-slate-50 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs">
                  {fleetData.vehiclesSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 whitespace-nowrap">
                        No active vehicles in this period.
                      </td>
                    </tr>
                  ) : (
                    fleetData.vehiclesSummary.map((v) => (
                      <tr key={v.vehicle_number} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {v.vehicle_number}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          {v.vehicle_type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                              v.payment_basis === 'FIXED'
                                ? 'bg-purple-50 text-purple-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {v.payment_basis}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                          {v.trip_count}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {formatNumber(v.total_km, 1)} km
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              v.trip_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {v.trip_count > 0 ? 'Active' : 'Idle'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: REQUEST & DEMAND VIEW                         */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'demand' && (
        <div className="space-y-4">
          {/* Demand KPI Cards */}
          {showKpiCards && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 transition-all duration-300">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Requests</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(demandData.totalRequests, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Completed Deliveries</p>
                  <p className="text-xl font-bold text-emerald-600 tracking-tight">
                    {formatNumber(demandData.completedRequests, 0)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dispatched Volume</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(demandData.totalCbm, 2)} <span className="text-xs font-semibold text-slate-400">CBM</span>
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <Boxes className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between min-h-[105px]">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dispatched Weight</p>
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {formatNumber(demandData.totalKg, 0)} <span className="text-xs font-semibold text-slate-400">KG</span>
                  </p>
                </div>
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Plant Demand Summary Table */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Plant-wise Transport Demand Summary</h3>
                <p className="text-xs text-slate-500">Total volume, weight, and urgent dispatch requirements per manufacturing origin</p>
              </div>
              <button
                onClick={handleExportCurrentTable}
                className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center shadow-xs whitespace-nowrap self-start md:self-auto"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export Excel
              </button>
            </div>

            <div className={tableContainerClass}>
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold shadow-xs">
                  <tr>
                    <th className="px-4 py-3 text-left bg-slate-50 whitespace-nowrap">Plant</th>
                    <th className="px-4 py-3 text-center bg-slate-50 whitespace-nowrap">Total Requests</th>
                    <th className="px-4 py-3 text-right bg-slate-50 whitespace-nowrap">Volume (CBM)</th>
                    <th className="px-4 py-3 text-right bg-slate-50 whitespace-nowrap">Weight (KG)</th>
                    <th className="px-4 py-3 text-center bg-slate-50 whitespace-nowrap">Urgent</th>
                    <th className="px-4 py-3 text-center bg-slate-50 whitespace-nowrap">Completed</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs">
                  {demandData.plantDemandSummary.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400 whitespace-nowrap">
                        No plant demand records.
                      </td>
                    </tr>
                  ) : (
                    demandData.plantDemandSummary.map((p) => (
                      <tr key={p.plant_name} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {p.plant_name}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-800 whitespace-nowrap">
                          {p.total_requests}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {formatNumber(p.total_cbm, 2)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {formatNumber(p.total_kg, 0)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              p.urgent_requests > 0 ? 'bg-red-50 text-red-700' : 'text-slate-400'
                            }`}
                          >
                            {p.urgent_requests}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-emerald-600 whitespace-nowrap">
                          {p.completed_requests}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 1: REQUEST COST DETAILS MODAL                  */}
      {/* ---------------------------------------------------- */}
      {selectedRequestCost && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>{selectedRequestCost.request_code}</span>
              </h3>
              <button
                onClick={() => setSelectedRequestCost(null)}
                className="text-slate-400 hover:text-slate-600 transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Plant</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedRequestCost.plant_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Weight (KG)</span>
                  <span className="font-bold text-slate-800 text-sm">{formatNumber(selectedRequestCost.kg, 0)} KG</span>
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3">
                <span className="text-slate-400 block uppercase font-bold text-[10px]">Item Description</span>
                <span className="font-medium text-slate-800 text-xs">{selectedRequestCost.item_description}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">From Location</span>
                  <span className="font-semibold text-slate-700">{selectedRequestCost.from_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">To Location</span>
                  <span className="font-semibold text-slate-700">{selectedRequestCost.to_name}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Assigned Trip No</span>
                  <span className="font-bold text-blue-600">{selectedRequestCost.trip_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Assigned Vehicle</span>
                  <span className="font-bold text-slate-800">{selectedRequestCost.vehicle_number}</span>
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center mt-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                    Attributed Transport Cost
                  </span>
                  <span className="text-xs text-emerald-600">Calculated based on weight share</span>
                </div>
                <span className="text-xl font-bold text-emerald-700">
                  Rs. {formatNumber(selectedRequestCost.allocated_cost, 2)}
                </span>
              </div>
            </div>
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
              <button
                onClick={() => setSelectedRequestCost(null)}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 2: VEHICLE MONTHLY REPORT MODAL                */}
      {/* ---------------------------------------------------- */}
      {selectedVehicleReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[94vw] max-w-[1250px] overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Vehicle Monthly Report</h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {selectedVehicleReport.vehicle_number}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const headers = ['Trip No', 'Date', 'Route', 'KM', 'Fuel Cost', 'Running Cost', 'Driver Profit', 'Day Fixed', 'Total Trip Cost'];
                    const rows = (selectedVehicleReport.trips || []).map((t: any) => [
                      t.tripNo || `TRIP-${t.id}`,
                      (t.createdAt || '').substring(0, 10),
                      t.route_name,
                      t.calc_km.toFixed(1),
                      t.fuel_cost.toFixed(2),
                      t.running_cost.toFixed(2),
                      t.driver_profit.toFixed(2),
                      t.fixed_daily_cost.toFixed(2),
                      t.total_trip_cost.toFixed(2),
                    ]);
                    exportToCsv(`Vehicle_Report_${selectedVehicleReport.vehicle_number}`, headers, rows);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </button>
                <button
                  onClick={() => setSelectedVehicleReport(null)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Header Information Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Reporting Period</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedMonth}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Vehicle Classification</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedVehicleReport.vehicle_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Payment Basis</span>
                  <span className="font-bold text-blue-700 text-sm">{selectedVehicleReport.payment_basis}</span>
                </div>
              </div>

              {/* Financial Metrics */}
              {selectedVehicleReport.payment_basis === 'FIXED' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Base Rental</span>
                    <span className="text-base font-bold text-slate-800">
                      Rs. {formatNumber(selectedVehicleReport.fixed_settlement?.base_rent || 0, 2)}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Free KM Limit</span>
                    <span className="text-base font-bold text-slate-800">
                      {formatNumber(selectedVehicleReport.fixed_settlement?.km_limit || 0, 0)} km
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Actual Run KM</span>
                    <span className="text-base font-bold text-blue-700">
                      {formatNumber(selectedVehicleReport.fixed_settlement?.actual_km || 0, 1)} km
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Extra KM Run</span>
                    <span className="text-base font-bold text-amber-700">
                      {formatNumber(selectedVehicleReport.fixed_settlement?.extra_km || 0, 1)} km
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Extra KM Cost</span>
                    <span className="text-base font-bold text-amber-700">
                      Rs. {formatNumber(selectedVehicleReport.fixed_settlement?.extra_charge || 0, 2)}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
                    <span className="text-emerald-800 block uppercase font-bold text-[10px]">Total Month Payout</span>
                    <span className="text-base font-bold text-emerald-700">
                      Rs. {formatNumber(selectedVehicleReport.total_payout, 2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Trips</span>
                    <span className="text-lg font-bold text-slate-800">{selectedVehicleReport.trip_count}</span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Run KM</span>
                    <span className="text-lg font-bold text-slate-800">
                      {formatNumber(selectedVehicleReport.total_km, 1)} km
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Fuel Cost</span>
                    <span className="text-lg font-bold text-slate-800">
                      Rs. {formatNumber(selectedVehicleReport.fuel_cost, 2)}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Running & Profit</span>
                    <span className="text-lg font-bold text-slate-800">
                      Rs. {formatNumber(selectedVehicleReport.running_cost + selectedVehicleReport.driver_profit, 2)}
                    </span>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Daily Fixed</span>
                    <span className="text-lg font-bold text-slate-800">
                      Rs. {formatNumber(selectedVehicleReport.daily_fixed, 2)}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl shadow-xs">
                    <span className="text-emerald-800 block uppercase font-bold text-[10px]">Total Payout</span>
                    <span className="text-lg font-bold text-emerald-700">
                      Rs. {formatNumber(selectedVehicleReport.total_payout, 2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Complete Dispatched Trips Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs">
                    All Dispatched Trips & Cost Breakdown
                  </h4>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {selectedVehicleReport.trips?.length || 0} trips
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="min-w-[1000px] w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Trip No</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Route</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Carried Requests</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">KM</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Fuel Cost</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Running Cost</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Driver Profit</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Day Fixed</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Total Trip Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-xs">
                      {(selectedVehicleReport.trips || []).length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-6 text-center text-slate-400 whitespace-nowrap">
                            No trips recorded for this vehicle in this month.
                          </td>
                        </tr>
                      ) : (
                        (selectedVehicleReport.trips || []).map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-2.5 font-semibold text-blue-600 whitespace-nowrap">
                              {t.tripNo || `TRIP-${t.id}`}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                              {(t.createdAt || '').substring(0, 10)}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap font-medium">
                              {t.route_name}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                              {(t.linked_requests || []).map((r: any) => r.request_code).join(', ') || '-'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800 whitespace-nowrap">
                              {t.calc_km.toFixed(1)} km
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(t.fuel_cost, 2)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(t.running_cost, 2)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-700 whitespace-nowrap">
                              Rs. {formatNumber(t.driver_profit, 2)}
                            </td>
                            <td className="px-4 py-2.5 text-right text-slate-500 whitespace-nowrap">
                              Rs. {formatNumber(t.fixed_daily_cost, 2)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-blue-700 whitespace-nowrap">
                              Rs. {formatNumber(t.total_trip_cost, 2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Vehicle Report
              </button>
              <button
                onClick={() => setSelectedVehicleReport(null)}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL 3: PLANT MONTHLY REPORT MODAL                  */}
      {/* ---------------------------------------------------- */}
      {selectedPlantReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[94vw] max-w-[1250px] overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">Plant Transport Cost Allocation Report</h3>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  {selectedPlantReport.plant_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const headers = ['Request Code', 'Date', 'From', 'To', 'Item Description', 'Weight (KG)', 'Trip No', 'Vehicle', 'Share %', 'Attributed Cost'];
                    const rows = (selectedPlantReport.requests || []).map((rc: any) => [
                      rc.request_code,
                      rc.required_date,
                      rc.from_name,
                      rc.to_name,
                      rc.item_description,
                      rc.kg.toFixed(0),
                      rc.trip_no,
                      rc.vehicle_number,
                      rc.share_pct + '%',
                      rc.allocated_cost.toFixed(2),
                    ]);
                    exportToCsv(`Plant_Report_${selectedPlantReport.plant_name}`, headers, rows);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-4 h-4" /> Export Excel
                </button>
                <button
                  onClick={() => setSelectedPlantReport(null)}
                  className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[75vh] overflow-y-auto">
              {/* Header Information Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Reporting Period</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedMonth}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Manufacturing Origin</span>
                  <span className="font-bold text-slate-800 text-sm">{selectedPlantReport.plant_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Budget Allocation Share</span>
                  <span className="font-bold text-blue-700 text-sm">{selectedPlantReport.share_pct}%</span>
                </div>
              </div>

              {/* Financial Summary Metrics (6 Cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Deliveries</span>
                  <span className="text-lg font-bold text-slate-800">{selectedPlantReport.request_count}</span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Volume</span>
                  <span className="text-lg font-bold text-slate-800">
                    {formatNumber(selectedPlantReport.total_cbm, 2)} CBM
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Total Weight</span>
                  <span className="text-lg font-bold text-slate-800">
                    {formatNumber(selectedPlantReport.total_kg, 0)} KG
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Avg Cost / CBM</span>
                  <span className="text-lg font-bold text-slate-800">
                    Rs. {formatNumber(selectedPlantReport.cost_per_cbm, 2)}
                  </span>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Avg Cost / KG</span>
                  <span className="text-lg font-bold text-slate-800">
                    Rs. {formatNumber(selectedPlantReport.cost_per_kg, 2)}
                  </span>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl shadow-xs">
                  <span className="text-blue-800 block uppercase font-bold text-[10px]">Total Plant Cost</span>
                  <span className="text-lg font-bold text-blue-700">
                    Rs. {formatNumber(selectedPlantReport.total_transport_cost, 2)}
                  </span>
                </div>
              </div>

              {/* Complete Requests Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-xs">
                    Dispatched Delivery Requests & Cost Attribution
                  </h4>
                  <span className="text-[11px] text-slate-500 font-semibold">
                    {selectedPlantReport.requests?.length || 0} requests
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-x-auto">
                  <table className="min-w-[1000px] w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase font-bold tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Request Code</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">From - To</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Item Description</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Volume (CBM)</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Weight (KG)</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Trip No</th>
                        <th className="px-4 py-2.5 text-left whitespace-nowrap">Vehicle</th>
                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Share %</th>
                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Attributed Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-xs">
                      {(selectedPlantReport.requests || []).length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-6 text-center text-slate-400 whitespace-nowrap">
                            No requests found for this plant.
                          </td>
                        </tr>
                      ) : (
                        (selectedPlantReport.requests || []).map((rc: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-2.5 font-semibold text-blue-600 whitespace-nowrap">
                              {rc.request_code}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                              {rc.required_date}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                              {rc.from_name} <span className="text-slate-400 mx-1">→</span> {rc.to_name}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap max-w-[200px] truncate" title={rc.item_description}>
                              {rc.item_description}
                            </td>
                            <td className="px-4 py-2.5 text-right font-medium text-slate-700 whitespace-nowrap">
                              {formatNumber(rc.cbm, 2)}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-slate-800 whitespace-nowrap">
                              {formatNumber(rc.kg, 0)} KG
                            </td>
                            <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                              {rc.trip_no}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                              {rc.vehicle_number}
                            </td>
                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold text-[11px]">
                                {rc.share_pct}%
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                              Rs. {formatNumber(rc.allocated_cost, 2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              <button
                onClick={() => window.print()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1.5 shadow-xs"
              >
                <Printer className="w-4 h-4" /> Print Plant Report
              </button>
              <button
                onClick={() => setSelectedPlantReport(null)}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-slate-50 transition shadow-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
