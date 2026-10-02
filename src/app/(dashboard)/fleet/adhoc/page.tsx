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
    vehicles = await prisma.vehicle.findMany({
      where: {
        ownershipType: "ADHOC",
      },
      orderBy: [{ active: "desc" }, { id: "desc" }],
      include: {
        drivers: {
          where: { active: 1 },
          take: 1,
        },
      },
    });
  } catch (err) {
    console.error("Error loading ad-hoc vehicles:", err);
    vehicles = [];
  }

  try {
    vehicleCategories = await prisma.masterData.findMany({
      where: {
        category: { code: "VEHICLE_CATEGORY" },
        active: 1,
      },
      orderBy: { sortOrder: "asc" },
    });
  } catch (err) {
    console.error("Error loading vehicle categories:", err);
    vehicleCategories = [];
  }

  // Ensure fallback categories if none exist in DB yet
  if (!vehicleCategories || vehicleCategories.length === 0) {
    vehicleCategories = [
      { id: 1, code: "LORRY", name: "Lorry" },
      { id: 2, code: "BIKE", name: "Bike" },
      { id: 3, code: "THREEWHEEL", name: "Threewheel" },
      { id: 4, code: "VAN", name: "Van" },
    ];
  }

  return (
    <AdhocFleetRegistryClient
      initialVehicles={JSON.parse(JSON.stringify(vehicles))}
      vehicleCategories={JSON.parse(JSON.stringify(vehicleCategories))}
    />
  );
}
