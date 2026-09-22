import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CombineTripsRegistryClient } from "@/components/allocations/CombineTripsRegistryClient";

export default async function CombineOverviewPage() {
  await getSession();

  let combineTrips: any[] = [];
  let availableVehicles: any[] = [];
  let availableDrivers: any[] = [];
  let activeRoutes: any[] = [];

  try {
    const [trips, vehicles, drivers, routes] = await Promise.all([
      prisma.deliveryTrip.findMany({
        include: {
          vehicle: true,
          driver: true,
          route: true,
          tripRequests: {
            include: {
              request: true,
            },
            orderBy: { loadingSequence: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 300,
      }),
      prisma.vehicle.findMany({
        where: { active: 1 },
        orderBy: { vehicleNumber: "asc" },
      }),
      prisma.driver.findMany({
        where: { active: 1 },
        orderBy: { name: "asc" },
      }),
      prisma.route.findMany({
        where: { active: 1 },
        orderBy: { routeName: "asc" },
      }),
    ]);

    combineTrips = trips;
    availableVehicles = vehicles;
    availableDrivers = drivers;
    activeRoutes = routes;
  } catch (err) {
    console.error("Failed to load combine trips:", err);
  }

  const serializedTrips = JSON.parse(JSON.stringify(combineTrips));
  const serializedVehicles = JSON.parse(JSON.stringify(availableVehicles));
  const serializedRoutes = JSON.parse(JSON.stringify(activeRoutes));
  const serializedDrivers = JSON.parse(JSON.stringify(availableDrivers));

  return (
    <div className="w-full">
      <CombineTripsRegistryClient
        initialTrips={serializedTrips}
        vehicles={serializedVehicles}
        drivers={serializedDrivers}
        routes={serializedRoutes}
      />
    </div>
  );
}
