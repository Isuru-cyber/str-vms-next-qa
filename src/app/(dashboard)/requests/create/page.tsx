import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { RequestCreateWizard } from "@/components/requests/RequestCreateWizard";

export default async function RequestCreatePage() {
  const user = await getSession();

  const plantWhere: any = { active: 1 };
  if (user && user.roleCode === "ENTRY_USER" && user.plantIds && user.plantIds.length > 0) {
    plantWhere.id = { in: user.plantIds };
  }

  const [operations, subOperations, plants, locations, vehicleTypes] = await Promise.all([
    prisma.operation.findMany({
      orderBy: { id: "asc" },
    }),
    prisma.masterData.findMany({
      where: {
        category: { code: "SUB_OPERATION" },
        active: 1,
      },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.plant.findMany({
      where: plantWhere,
      orderBy: { sortOrder: "asc" },
    }),
    prisma.location.findMany({
      where: { active: 1 },
      orderBy: { locationName: "asc" },
    }),
    prisma.masterData.findMany({
      where: {
        category: { code: "VEHICLE_TYPE" },
        active: 1,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Serialize Decimal / Date objects for Client Component
  const serializedLocations = JSON.parse(JSON.stringify(locations));
  const serializedSubOperations = JSON.parse(JSON.stringify(subOperations));
  const serializedVehicleTypes = JSON.parse(JSON.stringify(vehicleTypes));

  return (
    <div className="w-full">
      <RequestCreateWizard
        operations={operations}
        subOperations={serializedSubOperations}
        plants={plants}
        locations={serializedLocations}
        vehicleTypes={serializedVehicleTypes}
        currentUser={user}
      />
    </div>
  );
}
