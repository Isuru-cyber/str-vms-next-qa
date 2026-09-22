import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CombineWorkbenchClient } from "@/components/allocations/CombineWorkbenchClient";

export default async function CombineWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getSession();
  const resolvedParams = await params;
  const tripId = parseInt(resolvedParams.id, 10);

  if (isNaN(tripId)) {
    notFound();
  }

  const trip = await prisma.deliveryTrip.findUnique({
    where: { id: tripId },
    include: {
      vehicle: true,
      driver: true,
      route: true,
      tripRequests: {
        include: {
          request: {
            include: {
              plant: true,
              fromLocation: true,
              toLocation: true,
              requester: {
                select: { id: true, name: true, email: true, userCode: true },
              },
              subOperation: true,
            },
          },
        },
        orderBy: { loadingSequence: "asc" },
      },
    },
  });

  if (!trip) {
    notFound();
  }

  // Get unallocated requests (FG requests that are SUBMITTED or DRAFT and not in any active trip)
  const unallocatedRequests = await prisma.vehicleRequest.findMany({
    where: {
      status: { in: ["SUBMITTED", "DRAFT"] },
      tripRequests: {
        none: {
          trip: {
            status: { notIn: ["COMPLETED", "FINALIZED", "CLOSED", "CANCELLED"] },
          },
        },
      },
    },
    include: {
      plant: true,
      fromLocation: true,
      toLocation: true,
      requester: {
        select: { id: true, name: true, email: true, userCode: true },
      },
    },
    orderBy: { requiredDate: "asc" },
  });

  // Get active target trips for transfer
  const activeTargetTrips = await prisma.deliveryTrip.findMany({
    where: {
      status: { in: ["ASSIGNED", "READY_FOR_LOADING"] },
      id: { not: tripId },
    },
    include: {
      vehicle: true,
      driver: true,
      route: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Get active routes
  const routes = await prisma.route.findMany({
    where: { active: 1 },
    orderBy: { routeName: "asc" },
  });

  // Latest diesel rate
  const now = new Date();
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let dieselRate = 382.0;
  try {
    const fuelRateRecord = await prisma.monthlyFuelRate.findUnique({
      where: { periodMonth: currentPeriod },
    });
    if (fuelRateRecord) {
      dieselRate = Number(fuelRateRecord.dieselRate);
    }
  } catch {
    dieselRate = 382.0;
  }

  // Format serializable data
  const formattedTrip = {
    ...trip,
    plannedKm: Number(trip.plannedKm || 0),
    actualKm: Number(trip.actualKm || 0),
    createdAt: trip.createdAt?.toISOString(),
    updatedAt: trip.updatedAt?.toISOString(),
    completedAt: trip.completedAt?.toISOString(),
    route: trip.route
      ? {
          ...trip.route,
          totalDistanceKm: Number(trip.route.totalDistanceKm || 0),
          createdAt: trip.route.createdAt?.toISOString(),
          updatedAt: trip.route.updatedAt?.toISOString(),
        }
      : null,
    vehicle: trip.vehicle
      ? {
          ...trip.vehicle,
          maxPayloadKg: Number(trip.vehicle.maxPayloadKg || 0),
          maxVolumeCbm: Number(trip.vehicle.maxVolumeCbm || 0),
          fuelConsumptionKml: Number(trip.vehicle.fuelConsumptionKml || 0),
          runningCostPerKm: Number(trip.vehicle.runningCostPerKm || 0),
          profitPerKm: Number(trip.vehicle.profitPerKm || 0),
          fixedCostPerDay: Number(trip.vehicle.fixedCostPerDay || 0),
          monthlyFixedRate: Number(trip.vehicle.monthlyFixedRate || 0),
          monthlyKmLimit: Number(trip.vehicle.monthlyKmLimit || 0),
          extraKmRate: Number(trip.vehicle.extraKmRate || 0),
        }
      : null,
    driver: trip.driver
      ? {
          ...trip.driver,
          licenseExpiry: trip.driver.licenseExpiry?.toISOString(),
        }
      : null,
  };

  const initialLinkedRequests = trip.tripRequests.map((tr: any) => ({
    ...tr.request,
    loadingSequence: tr.loadingSequence,
    requiredKg: Number(tr.request.requiredKg || 0),
    requiredCbm: Number(tr.request.requiredCbm || 0),
    plannedDistanceKm: Number(tr.request.plannedDistanceKm || 0),
    quantity: Number(tr.request.quantity || 0),
    requiredDate: tr.request.requiredDate?.toISOString(),
    createdAt: tr.request.createdAt?.toISOString(),
    updatedAt: tr.request.updatedAt?.toISOString(),
    subOperation: tr.request.subOperation
      ? {
          ...tr.request.subOperation,
          defaultFuelConsumption: Number(tr.request.subOperation.defaultFuelConsumption || 0),
          defaultRunningCostPerKm: Number(tr.request.subOperation.defaultRunningCostPerKm || 0),
          defaultProfitPerKm: Number(tr.request.subOperation.defaultProfitPerKm || 0),
          defaultFixedCostPerDay: Number(tr.request.subOperation.defaultFixedCostPerDay || 0),
        }
      : null,
  }));

  const initialAvailableRequests = unallocatedRequests.map((req: any) => ({
    ...req,
    requiredKg: Number(req.requiredKg || 0),
    requiredCbm: Number(req.requiredCbm || 0),
    plannedDistanceKm: Number(req.plannedDistanceKm || 0),
    quantity: Number(req.quantity || 0),
    requiredDate: req.requiredDate?.toISOString(),
    createdAt: req.createdAt?.toISOString(),
    updatedAt: req.updatedAt?.toISOString(),
    subOperation: req.subOperation
      ? {
          ...req.subOperation,
          defaultFuelConsumption: Number(req.subOperation.defaultFuelConsumption || 0),
          defaultRunningCostPerKm: Number(req.subOperation.defaultRunningCostPerKm || 0),
          defaultProfitPerKm: Number(req.subOperation.defaultProfitPerKm || 0),
          defaultFixedCostPerDay: Number(req.subOperation.defaultFixedCostPerDay || 0),
        }
      : null,
  }));

  const formattedRoutes = routes.map((r: any) => ({
    id: r.id,
    routeName: r.routeName,
    routeCode: r.routeCode,
    totalDistanceKm: Number(r.totalDistanceKm || 0),
  }));

  const formattedTargetTrips = activeTargetTrips.map((t: any) => ({
    id: t.id,
    tripNo: t.tripNo,
    vehicle: t.vehicle
      ? {
          id: t.vehicle.id,
          vehicleNumber: t.vehicle.vehicleNumber,
          registrationNo: t.vehicle.vehicleNumber,
          vehicleType: t.vehicle.vehicleType,
          maxPayloadKg: Number(t.vehicle.maxPayloadKg || 0),
          maxVolumeCbm: Number(t.vehicle.maxVolumeCbm || 0),
        }
      : null,
    driver: t.driver
      ? {
          id: t.driver.id,
          name: t.driver.name,
          fullName: t.driver.name,
          mobile: t.driver.mobile,
          phone: t.driver.mobile,
        }
      : null,
    route: t.route
      ? {
          id: t.route.id,
          routeName: t.route.routeName,
          routeCode: t.route.routeCode,
          totalDistanceKm: Number(t.route.totalDistanceKm || 0),
        }
      : null,
  }));

  return (
    <CombineWorkbenchClient
      initialTrip={formattedTrip}
      initialLinkedRequests={initialLinkedRequests}
      initialAvailableRequests={initialAvailableRequests}
      activeTargetTrips={formattedTargetTrips}
      routes={formattedRoutes}
      dieselRate={dieselRate}
    />
  );
}
