import React from "react";
import { prisma } from "@/lib/prisma";
import { MasterDataHub } from "@/components/master-data/MasterDataHub";

export default async function MasterDataPage() {
  let vehicleTypes: any[] = [];
  let subOperations: any[] = [];
  let plants: any[] = [];

  try {
    const [vTypes, sOps, pList] = await Promise.all([
      prisma.masterData.findMany({
        where: { category: { code: "VEHICLE_TYPE" } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.masterData.findMany({
        where: { category: { code: "SUB_OPERATION" } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.plant.findMany({
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    vehicleTypes = vTypes;
    subOperations = sOps;
    plants = pList;
  } catch (e) {}

  return (
    <MasterDataHub
      initialVehicleTypes={JSON.parse(JSON.stringify(vehicleTypes))}
      initialSubOperations={JSON.parse(JSON.stringify(subOperations))}
      initialPlants={JSON.parse(JSON.stringify(plants))}
    />
  );
}
