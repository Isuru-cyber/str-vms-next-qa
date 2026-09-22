import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { FuelRateManager } from "@/components/fuel-rates/FuelRateManager";

export default async function FuelRatesPage() {
  await getSession();

  let rates: any[] = [];
  try {
    const rawRates = await prisma.monthlyFuelRate.findMany({
      orderBy: { periodMonth: "desc" },
    });
    rates = rawRates.map((r: any) => ({
      id: r.id,
      periodMonth: r.periodMonth,
      dieselRate: Number(r.dieselRate),
      isLocked: r.isLocked,
      notes: r.notes,
      createdAt: r.createdAt?.toISOString(),
      updatedAt: r.updatedAt?.toISOString(),
    }));
  } catch (err) {
    console.error("Failed to load fuel rates:", err);
  }

  return <FuelRateManager initialRates={rates} />;
}
