import React from "react";
import { prisma } from "@/lib/prisma";
import { VehicleRegistry } from "@/components/fleet/VehicleRegistry";

export default async function FleetVehiclesPage() {
  let vehicles: any[] = [];
  let locations: any[] = [];
  let operations: any[] = [];
  let vehicleTypes: any[] = [];

  try {
    const [vehs, locs, ops, vTypes] = await Promise.all([
      prisma.vehicle.findMany({
        where: { active: 1 },
        orderBy: { id: "asc" },
        include: {
          operationCategory: true,
          defaultLocation: true,
        },
      }),
      prisma.location.findMany({
        where: {
          active: 1,
          OR: [
            { locationType: "PLANT" },
            { plantId: { not: null } },
          ],
        },
        include: { plant: true },
        orderBy: { locationName: "asc" },
      }),
      prisma.operation.findMany({
        orderBy: { name: "asc" },
      }),
      prisma.masterData.findMany({
        where: {
          category: { code: "VEHICLE_TYPE" },
          active: 1,
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    // Sort plant locations by plant's sortOrder
    const sortedPlantLocations = locs.sort((a: any, b: any) => {
      const orderA = a.plant?.sortOrder ?? 99;
      const orderB = b.plant?.sortOrder ?? 99;
      return orderA - orderB;
    });

    vehicles = vehs;
    locations = sortedPlantLocations;
    operations = ops;
    vehicleTypes = vTypes;
  } catch {
    vehicles = [];
    locations = [];
    operations = [];
    vehicleTypes = [];
  }

  return (
    <VehicleRegistry
      initialVehicles={JSON.parse(JSON.stringify(vehicles))}
      locations={JSON.parse(JSON.stringify(locations))}
      operations={JSON.parse(JSON.stringify(operations))}
      vehicleTypes={JSON.parse(JSON.stringify(vehicleTypes))}
    />
  );
}
