import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { FleetAvailabilityView, VehicleAvailabilityItem } from "@/components/fleet/FleetAvailabilityView";

export default async function FleetAvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  await getSession();
  const { month } = await searchParams;

  const now = new Date();
  const currentMonth =
    month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [yearStr, monthStr] = currentMonth.split("-");
  const startDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
  const endDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0, 23, 59, 59);

  let vehicleItems: VehicleAvailabilityItem[] = [];

  try {
    const [vehicles, monthTrips] = await Promise.all([
      prisma.vehicle.findMany({
        where: { active: 1 },
        include: {
          defaultLocation: true,
          drivers: {
            take: 1,
          },
        },
        orderBy: { vehicleNumber: "asc" },
      }),
      prisma.deliveryTrip.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          tripNo: true,
          vehicleId: true,
          status: true,
          actualKm: true,
          plannedKm: true,
        },
      }),
    ]);

    // Active trips currently on the road (any date)
    const activeTrips = await prisma.deliveryTrip.findMany({
      where: {
        status: { in: ["ASSIGNED", "READY_FOR_LOADING", "DISPATCHED", "IN_TRANSIT"] },
      },
      select: {
        id: true,
        tripNo: true,
        vehicleId: true,
      },
    });

    const activeTripMap = new Map<number, { id: number; tripNo: string }>();
    activeTrips.forEach((t: any) => activeTripMap.set(t.vehicleId, { id: t.id, tripNo: t.tripNo }));

    vehicleItems = vehicles.map((v: any) => {
      const vTrips = monthTrips.filter((t: any) => t.vehicleId === v.id);
      const mtdKm = vTrips.reduce((sum: number, t: any) => {
        const km = Number(t.actualKm) > 0 ? Number(t.actualKm) : Number(t.plannedKm) || 0;
        return sum + km;
      }, 0);

      const mtdTrips = vTrips.filter((t: any) => t.status === "COMPLETED").length;
      const targetLimit = Number(v.monthlyKmLimit) > 0 ? Number(v.monthlyKmLimit) : 2500;
      const utilizationPct = targetLimit > 0 ? (mtdKm / targetLimit) * 100 : 0;
      const activeTrip = activeTripMap.get(v.id);

      return {
        id: v.id,
        vehicleNumber: v.vehicleNumber,
        vehicleType: v.vehicleType,
        maxPayloadKg: Number(v.maxPayloadKg || 0),
        paymentBasis: v.paymentBasis || "KM_BASED",
        status: activeTrip ? "ALLOCATED" : v.status,
        activeTripNo: activeTrip?.tripNo || null,
        activeTripId: activeTrip?.id || null,
        driverName: v.drivers?.[0]?.name || null,
        driverPhone: v.drivers?.[0]?.mobile || null,
        mtdKm,
        mtdTrips,
        targetLimit,
        utilizationPct,
        homePlant: v.defaultLocation?.locationName || "Central Fleet",
      };
    });
  } catch (err) {
    console.error("Failed to load fleet availability:", err);
  }

  return (
    <FleetAvailabilityView
      initialVehicles={vehicleItems}
      selectedMonth={currentMonth}
    />
  );
}
