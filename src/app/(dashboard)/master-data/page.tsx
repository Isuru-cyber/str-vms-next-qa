import React from "react";
import { prisma } from "@/lib/prisma";
import { MasterDataHub } from "@/components/master-data/MasterDataHub";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  let vehicleTypes: any[] = [];
  let subOperations: any[] = [];
  let plants: any[] = [];
  let vehicleCategories: any[] = [];
  let deliveryWindows: any[] = [];
  let planningTypes: any[] = [];
  let requestedByDepts: any[] = [];

  try {
    const [vTypes, sOps, pList, vCats, dWindows, pTypes, reqDepts] = await Promise.all([
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
      prisma.masterData.findMany({
        where: { category: { code: "VEHICLE_CATEGORY" } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.masterData.findMany({
        where: { category: { code: "DELIVERY_WINDOW" } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.masterData.findMany({
        where: { category: { code: "PLANNING_TYPE" } },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.masterData.findMany({
        where: { category: { code: "REQUESTED_BY" } },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    vehicleTypes = vTypes;
    subOperations = sOps;
    plants = pList;
    vehicleCategories = vCats;
    deliveryWindows = dWindows;
    planningTypes = pTypes;
    requestedByDepts = reqDepts;
  } catch (e) {
    console.error("Master data load error:", e);
  }

  return (
    <MasterDataHub
      initialVehicleTypes={JSON.parse(JSON.stringify(vehicleTypes))}
      initialSubOperations={JSON.parse(JSON.stringify(subOperations))}
      initialPlants={JSON.parse(JSON.stringify(plants))}
      initialVehicleCategories={JSON.parse(JSON.stringify(vehicleCategories))}
      initialDeliveryWindows={JSON.parse(JSON.stringify(deliveryWindows))}
      initialPlanningTypes={JSON.parse(JSON.stringify(planningTypes))}
      initialRequestedByDepts={JSON.parse(JSON.stringify(requestedByDepts))}
    />
  );
}
