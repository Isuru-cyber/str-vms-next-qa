import React from "react";
import { prisma } from "@/lib/prisma";
import { LocationRegistry } from "@/components/locations/LocationRegistry";

export default async function LocationMasterPage() {
  let locations: any[] = [];
  let plants: any[] = [];
  try {
    [locations, plants] = await Promise.all([
      prisma.location.findMany({
        orderBy: { locationName: "asc" },
        include: { plant: true },
      }),
      prisma.plant.findMany({
        orderBy: { sortOrder: "asc" },
      }),
    ]);
  } catch (e) {
    locations = [];
    plants = [];
  }

  return (
    <LocationRegistry
      initialLocations={JSON.parse(JSON.stringify(locations))}
      plants={JSON.parse(JSON.stringify(plants))}
    />
  );
}
