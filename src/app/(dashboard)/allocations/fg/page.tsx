import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permission-utils";
import { FgAllocationHubClient } from "@/components/allocations/FgAllocationHubClient";

export default async function FgAllocationPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!can(user, "view_allocations")) {
    redirect("/");
  }

  const whereClause: any = {};
  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    whereClause.plantId = { in: user.plantIds };
  } else if (!isAdmin(user) && (!user.plantIds || user.plantIds.length === 0)) {
    whereClause.plantId = -1;
  }

  const [requests, plants, operations, vehicles, drivers, routes] = await Promise.all([
    prisma.vehicleRequest.findMany({
      where: whereClause,
      include: {
        plant: true,
        operation: true,
        subOperation: true,
        vehicleType: true,
        fromLocation: true,
        toLocation: true,
        requester: {
          select: { id: true, name: true, email: true, userCode: true },
        },
        tripRequests: {
          include: {
            trip: {
              include: {
                vehicle: true,
                driver: true,
                route: true,
              },
            },
          },
        },
      },
      orderBy: [{ requiredDate: "desc" }, { id: "desc" }],
      take: 500,
    }),
    prisma.plant.findMany({
      where: !isAdmin(user) ? (user.plantIds?.length ? { id: { in: user.plantIds } } : { id: -1 }) : undefined,
      orderBy: { sortOrder: "asc" }
    }),
    prisma.operation.findMany({ orderBy: { name: "asc" } }),
    prisma.vehicle.findMany({
      where: {
        active: 1,
        ...(!isAdmin(user)
          ? user.plantIds?.length
            ? {
                OR: [
                  { defaultLocation: { plantId: { in: user.plantIds } } },
                  { drivers: { some: { linkedPlantId: { in: user.plantIds } } } },
                ],
              }
            : { id: -1 }
          : {}),
      },
      orderBy: { vehicleNumber: "asc" },
    }),
    prisma.driver.findMany({
      where: {
        active: 1,
        ...(!isAdmin(user)
          ? user.plantIds?.length
            ? { linkedPlantId: { in: user.plantIds } }
            : { id: -1 }
          : {}),
      },
      orderBy: { name: "asc" },
    }),
    prisma.route.findMany({
      where: {
        active: 1,
        ...(!isAdmin(user) && user.plantIds?.length
          ? { originLocation: { plantId: { in: user.plantIds } } }
          : {}),
      },
      orderBy: { routeName: "asc" },
    }),
  ]);

  // Serialize Decimal objects for Client Components
  const serializedRequests = JSON.parse(JSON.stringify(requests));
  const serializedVehicles = JSON.parse(JSON.stringify(vehicles));
  const serializedRoutes = JSON.parse(JSON.stringify(routes));
  const serializedDrivers = JSON.parse(JSON.stringify(drivers));

  return (
    <div className="w-full">
      <FgAllocationHubClient
        initialRequests={serializedRequests}
        plants={plants}
        operations={operations}
        vehicles={serializedVehicles}
        drivers={serializedDrivers}
        routes={serializedRoutes}
      />
    </div>
  );
}
