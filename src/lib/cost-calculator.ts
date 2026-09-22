export interface VehicleCostParams {
  id?: number;
  vehicle_number?: string;
  vehicleNumber?: string;
  fuel_consumption_kml?: number | string | null;
  fuelConsumptionKml?: number | string | null;
  running_cost_per_km?: number | string | null;
  runningCostPerKm?: number | string | null;
  profit_per_km?: number | string | null;
  profitPerKm?: number | string | null;
  fixed_cost_per_day?: number | string | null;
  fixedCostPerDay?: number | string | null;
  monthly_fixed_rate?: number | string | null;
  monthlyFixedRate?: number | string | null;
  monthly_km_limit?: number | null;
  monthlyKmLimit?: number | null;
  extra_km_rate?: number | string | null;
  extraKmRate?: number | string | null;
}

export interface TripCostBreakdown {
  km: number;
  diesel_rate: number;
  fuel_consumption: number;
  fuel_cost_per_km: number;
  running_cost_per_km: number;
  profit_per_km: number;
  per_km_rate: number;
  fuel_cost: number;
  running_cost: number;
  driver_profit: number;
  fixed_daily_cost: number;
  total_trip_cost: number;
}

export interface RequestCostShare {
  request_id: number;
  request_code: string;
  kg: number;
  cbm: number;
  share_pct: number;
  allocated_cost: number;
}

export interface FixedFleetSettlement {
  vehicle_id?: number | null;
  vehicle_number: string;
  base_rent: number;
  km_limit: number;
  actual_km: number;
  extra_km: number;
  extra_km_rate: number;
  extra_charge: number;
  total_payout: number;
}

export interface ConsolidationSavings {
  standalone_total_cost: number;
  actual_combined_cost: number;
  net_savings: number;
  savings_pct: number;
  is_consolidated: boolean;
  standalone_breakdown: Array<{
    request_code: string;
    from_name: string;
    to_name: string;
    direct_km: number;
    standalone_cost: number;
  }>;
}

export class CostCalculator {
  /**
   * Calculate KM-based Trip Cost
   */
  public static calculateTripCost(
    km: number,
    vehicle: VehicleCostParams,
    dieselRate: number,
    workingDays: number = 1
  ): TripCostBreakdown {
    const cleanKm = Math.max(0, Number(km) || 0);
    const cleanDiesel = Math.max(0, Number(dieselRate) || 0);
    const cleanDays = Math.max(0, Number(workingDays) || 1);

    const rawConsumption = Number(
      vehicle.fuel_consumption_kml ?? vehicle.fuelConsumptionKml ?? 10
    );
    const consumption = rawConsumption > 0 ? rawConsumption : 10;

    const runningCostPerKm = Number(
      vehicle.running_cost_per_km ?? vehicle.runningCostPerKm ?? 20.5
    );
    const profitPerKm = Number(
      vehicle.profit_per_km ?? vehicle.profitPerKm ?? 15.0
    );
    const fixedCostPerDay = Number(
      vehicle.fixed_cost_per_day ?? vehicle.fixedCostPerDay ?? 1795.36
    );

    // Per KM Rates
    const fuelCostPerKm = consumption > 0 ? cleanDiesel / consumption : 0;
    const perKmRate = fuelCostPerKm + runningCostPerKm + profitPerKm;

    // Component Totals
    const fuelCost = fuelCostPerKm * cleanKm;
    const runningCost = runningCostPerKm * cleanKm;
    const driverProfit = profitPerKm * cleanKm;
    const fixedDailyCost = fixedCostPerDay * cleanDays;
    const totalTripCost = perKmRate * cleanKm + fixedDailyCost;

    return {
      km: cleanKm,
      diesel_rate: cleanDiesel,
      fuel_consumption: consumption,
      fuel_cost_per_km: Number(fuelCostPerKm.toFixed(2)),
      running_cost_per_km: Number(runningCostPerKm.toFixed(2)),
      profit_per_km: Number(profitPerKm.toFixed(2)),
      per_km_rate: Number(perKmRate.toFixed(2)),
      fuel_cost: Number(fuelCost.toFixed(2)),
      running_cost: Number(runningCost.toFixed(2)),
      driver_profit: Number(driverProfit.toFixed(2)),
      fixed_daily_cost: Number(fixedDailyCost.toFixed(2)),
      total_trip_cost: Number(totalTripCost.toFixed(2)),
    };
  }

  /**
   * Proportionally split Trip Cost across linked requests based on Weight KG (or CBM / count)
   */
  public static allocateRequestCostShare(
    totalTripCost: number,
    linkedRequests: Array<{
      id: number;
      request_code?: string;
      requestCode?: string;
      required_kg?: number | string | null;
      requiredKg?: number | string | null;
      required_cbm?: number | string | null;
      requiredCbm?: number | string | null;
    }>
  ): Record<number, RequestCostShare> {
    if (!linkedRequests || linkedRequests.length === 0 || totalTripCost <= 0) {
      return {};
    }

    let totalKg = 0;
    let totalCbm = 0;
    let validKgCount = 0;
    let validCbmCount = 0;

    for (const r of linkedRequests) {
      const kg = Number(r.required_kg ?? r.requiredKg ?? 0);
      const cbm = Number(r.required_cbm ?? r.requiredCbm ?? 0);
      if (kg > 0) {
        totalKg += kg;
        validKgCount++;
      }
      if (cbm > 0) {
        totalCbm += cbm;
        validCbmCount++;
      }
    }

    const count = linkedRequests.length;
    let basis: "kg" | "cbm" | "equal" = "equal";
    if (totalKg > 0 && validKgCount === count) {
      basis = "kg";
    } else if (totalCbm > 0 && validCbmCount === count) {
      basis = "cbm";
    } else if (totalKg > 0) {
      basis = "kg";
    } else if (totalCbm > 0) {
      basis = "cbm";
    }

    const result: Record<number, RequestCostShare> = {};

    for (const r of linkedRequests) {
      const reqKg = Number(r.required_kg ?? r.requiredKg ?? 0);
      const reqCbm = Number(r.required_cbm ?? r.requiredCbm ?? 0);

      let sharePct = 0;
      if (basis === "kg" && totalKg > 0) {
        sharePct = reqKg > 0 ? reqKg / totalKg : 0;
      } else if (basis === "cbm" && totalCbm > 0) {
        sharePct = reqCbm > 0 ? reqCbm / totalCbm : 0;
      } else {
        sharePct = count > 0 ? 1.0 / count : 0;
      }

      const allocatedCost = Number((totalTripCost * sharePct).toFixed(2));
      result[r.id] = {
        request_id: r.id,
        request_code: r.request_code ?? r.requestCode ?? `REQ-${r.id}`,
        kg: reqKg,
        cbm: reqCbm,
        share_pct: Number((sharePct * 100).toFixed(1)),
        allocated_cost: allocatedCost,
      };
    }

    return result;
  }

  /**
   * Calculate Monthly Settlement for Fixed Fleet
   */
  public static calculateFixedFleetSettlement(
    vehicle: VehicleCostParams,
    totalRunKm: number
  ): FixedFleetSettlement {
    const baseRent = Number(
      vehicle.monthly_fixed_rate ?? vehicle.monthlyFixedRate ?? 0
    );
    const kmLimit = Number(
      vehicle.monthly_km_limit ?? vehicle.monthlyKmLimit ?? 0
    );
    const extraKmRate = Number(
      vehicle.extra_km_rate ?? vehicle.extraKmRate ?? 0
    );
    const actualKm = Math.max(0, Number(totalRunKm) || 0);

    const extraKm = kmLimit > 0 ? Math.max(0, actualKm - kmLimit) : 0;
    const extraCharge = extraKm * extraKmRate;
    const totalPayout = baseRent + extraCharge;

    return {
      vehicle_id: vehicle.id ?? null,
      vehicle_number: vehicle.vehicle_number ?? vehicle.vehicleNumber ?? "",
      base_rent: Number(baseRent.toFixed(2)),
      km_limit: kmLimit,
      actual_km: Number(actualKm.toFixed(1)),
      extra_km: Number(extraKm.toFixed(1)),
      extra_km_rate: Number(extraKmRate.toFixed(2)),
      extra_charge: Number(extraCharge.toFixed(2)),
      total_payout: Number(totalPayout.toFixed(2)),
    };
  }

  /**
   * Calculate Trip Consolidation Cost Savings vs Standalone Trips
   */
  public static calculateConsolidationSavings(
    actualCombinedCost: number,
    vehicle: VehicleCostParams,
    linkedRequests: Array<{
      id: number;
      request_code?: string;
      requestCode?: string;
      from_name?: string;
      to_name?: string;
      planned_distance_km?: number | string | null;
      plannedDistanceKm?: number | string | null;
      directKm?: number;
    }>,
    dieselRate: number
  ): ConsolidationSavings {
    const combinedCost = Number(actualCombinedCost) || 0;
    const reqCount = linkedRequests.length;

    if (reqCount <= 1 || combinedCost <= 0) {
      return {
        standalone_total_cost: combinedCost,
        actual_combined_cost: combinedCost,
        net_savings: 0,
        savings_pct: 0,
        is_consolidated: false,
        standalone_breakdown: [],
      };
    }

    let standaloneTotal = 0;
    const breakdown: ConsolidationSavings["standalone_breakdown"] = [];

    for (const r of linkedRequests) {
      const directKm =
        r.directKm ??
        Number(r.planned_distance_km ?? r.plannedDistanceKm ?? 20);

      const standaloneTrip = this.calculateTripCost(
        directKm,
        vehicle,
        dieselRate,
        1
      );
      const standaloneCost = standaloneTrip.total_trip_cost;
      standaloneTotal += standaloneCost;

      breakdown.push({
        request_code: r.request_code ?? r.requestCode ?? `REQ-${r.id}`,
        from_name: r.from_name ?? "",
        to_name: r.to_name ?? "",
        direct_km: directKm,
        standalone_cost: standaloneCost,
      });
    }

    const netSavings = Math.max(0, standaloneTotal - combinedCost);
    const savingsPct =
      standaloneTotal > 0
        ? Number(((netSavings / standaloneTotal) * 100).toFixed(1))
        : 0;

    return {
      standalone_total_cost: Number(standaloneTotal.toFixed(2)),
      actual_combined_cost: Number(combinedCost.toFixed(2)),
      net_savings: Number(netSavings.toFixed(2)),
      savings_pct: savingsPct,
      is_consolidated: true,
      standalone_breakdown: breakdown,
    };
  }
}
