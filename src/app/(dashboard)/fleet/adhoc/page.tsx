import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { can } from "@/lib/permission-utils";
import { AdhocFleetRegistryClient } from "@/components/fleet/AdhocFleetRegistryClient";

export const metadata = {
  title: "Outside & Ad-Hoc Fleet Registry | STR-VMS",
  description: "Manage external temporary vehicles, transporters, and drivers for ad-hoc deliveries.",
};

export default async function AdhocFleetPage() {
  const user = await getSession();
  if (!user) redirect("/login");
  if (!can(user, "view_fleet")) redirect("/");

  let vehicles: any[] = [];
  let vehicleCategories: any[] = [];

  try {
    const [vehs, vCats] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          ownershipType: "ADHOC",
        },
        orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
        include: {
          drivers: {
            where: { active: 1 },
            take: 1,
          },
        },
      }),
      prisma.masterData.findMany({
        where: {
          category: { code: "VEHICLE_CATEGORY" },
          active: 1,
        },
        orderBy: { sortOrder: "asc" },
      }),
    ]);
    vehicles = vehs;
    vehicleCategories = vCats;
  } catch (err) {
    console.error("Error loading ad-hoc fleet data:", err);
  }

  return (
    <AdhocFleetRegistryClient
      initialVehicles={JSON.parse(JSON.stringify(vehicles))}
      vehicleCategories={JSON.parse(JSON.stringify(vehicleCategories))}
    />
  );
}
