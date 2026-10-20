import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin, can } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { FullTripDetailsClient } from "@/components/trips/FullTripDetailsClient";

export const dynamic = "force-dynamic";

export default async function FullTripDetailsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  // Plant access filter for non-admin
  const where: any = {};
  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    where.tripRequests = {
      some: {
        request: {
          plantId: { in: user.plantIds },
        },
      },
    };
  } else if (!isAdmin(user) && (!user.plantIds || user.plantIds.length === 0)) {
    where.id = -1;
  }

  let trips: any[] = [];
  let plants: any[] = [];
  let vehicles: any[] = [];
  let masterOptions: any[] = [];

  try {
    const [dbTrips, dbPlants, dbVehicles, dbMaster] = await Promise.all([
      prisma.deliveryTrip.findMany({
        where,
        take: 300,
        orderBy: { id: "desc" },
        include: {
          vehicle: {
            include: {
              defaultLocation: true,
            },
          },
          driver: true,
          route: {
            include: {
              originLocation: true,
            },
          },
          gatePasses: {
            orderBy: { id: "asc" },
          },
          reconciliations: {
            orderBy: { id: "desc" },
            take: 1,
          },
          tripRequests: {
            include: {
              request: {
                include: {
                  plant: true,
                  fromLocation: true,
                  toLocation: true,
                  subOperation: true,
                  requester: {
                    select: { id: true, name: true, email: true, userCode: true },
                  },
                },
              },
            },
            orderBy: { loadingSequence: "asc" },
          },
        },
      }),

      prisma.plant.findMany({
        where: !isAdmin(user) && user.plantIds?.length ? { id: { in: user.plantIds } } : {},
        orderBy: { sortOrder: "asc" },
      }),

      prisma.vehicle.findMany({
        where: { active: 1 },
        orderBy: { vehicleNumber: "asc" },
        select: {
          id: true,
          vehicleNumber: true,
          vehicleType: true,
          vehicleCategory: true,
          ownershipType: true,
        },
      }),

      prisma.masterData.findMany({
        where: {
          active: 1,
          category: {
            code: { in: ["DELIVERY_WINDOW", "PLANNING_TYPE", "REQUESTED_BY"] },
          },
        },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      }),
    ]);

    trips = JSON.parse(JSON.stringify(dbTrips));
    plants = JSON.parse(JSON.stringify(dbPlants));
    vehicles = JSON.parse(JSON.stringify(dbVehicles));
    masterOptions = JSON.parse(JSON.stringify(dbMaster));
  } catch (error) {
    console.error("Error loading full trip details:", error);
  }

  const deliveryWindows = masterOptions
    .filter((m) => m.category.code === "DELIVERY_WINDOW")
    .map((m) => ({ code: m.code, name: m.name }));
  const planningTypes = masterOptions
    .filter((m) => m.category.code === "PLANNING_TYPE")
    .map((m) => ({ code: m.code, name: m.name }));
  const requestedByDepts = masterOptions
    .filter((m) => m.category.code === "REQUESTED_BY")
    .map((m) => ({ code: m.code, name: m.name }));

  return (
    <FullTripDetailsClient
      initialTrips={trips}
      plants={plants}
      vehicles={vehicles}
      masterOptions={{
        deliveryWindows,
        planningTypes,
        requestedByDepts,
      }}
    />
  );
}
