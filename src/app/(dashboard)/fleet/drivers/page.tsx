import React from "react";
import { prisma } from "@/lib/prisma";
import { DriverRegistry } from "@/components/fleet/DriverRegistry";

export default async function DriversPage() {
  let drivers: any[] = [];
  let vehicles: any[] = [];
  let plants: any[] = [];

  try {
    const [dList, vList, pList] = await Promise.all([
      prisma.driver.findMany({
        where: { active: 1 },
        orderBy: { id: "asc" },
        include: {
          linkedVehicle: true,
          linkedPlant: true,
        },
      }),
      prisma.vehicle.findMany({
        where: { active: 1 },
        orderBy: { vehicleNumber: "asc" },
      }),
      prisma.plant.findMany({
        where: { active: 1 },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    drivers = dList;
    vehicles = vList;
    plants = pList;
  } catch (e) {
    drivers = [];
    vehicles = [];
    plants = [];
  }

  return (
    <DriverRegistry
      initialDrivers={JSON.parse(JSON.stringify(drivers))}
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      plants={JSON.parse(JSON.stringify(plants))}
    />
  );
}
