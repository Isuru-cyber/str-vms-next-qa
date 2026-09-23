import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permission-utils";
import { ExecutiveAnalyticsClient } from "@/components/analytics/ExecutiveAnalyticsClient";

export const metadata = {
  title: "Executive Analytics | STR-VMS",
  description: "Strategic top management dashboard, visual KPI analytics, and cost efficiency insights.",
};

export default async function AnalyticsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!can(user, "view_analytics")) {
    redirect("/");
  }

  const tripWhere: any = {};
  const requestWhere: any = {};

  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    tripWhere.tripRequests = {
      some: {
        request: {
          plantId: { in: user.plantIds },
        },
      },
    };
    requestWhere.plantId = { in: user.plantIds };
  } else if (!isAdmin(user) && (!user.plantIds || user.plantIds.length === 0)) {
    tripWhere.id = -1;
    requestWhere.id = -1;
  }

  let trips: any[] = [];
  try {
    trips = await prisma.deliveryTrip.findMany({
      where: tripWhere,
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        vehicle: true,
        driver: true,
        route: true,
        tripRequests: {
          include: {
            request: {
              include: {
                plant: true,
                fromLocation: true,
                toLocation: true,
              },
            },
          },
        },
      },
    });
  } catch (err) {
    trips = [];
  }

  let requests: any[] = [];
  try {
    requests = await prisma.vehicleRequest.findMany({
      where: requestWhere,
      take: 500,
      orderBy: { createdAt: "desc" },
      include: {
        plant: true,
        fromLocation: true,
        toLocation: true,
        tripRequests: {
          include: {
            trip: true,
          },
        },
      },
    });
  } catch (err) {
    requests = [];
  }

  let vehicles: any[] = [];
  try {
    vehicles = await prisma.vehicle.findMany({
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
      include: {
        drivers: true,
      },
    });
  } catch (err) {
    vehicles = [];
  }

  let plants: any[] = [];
  try {
    plants = await prisma.plant.findMany({
      where: !isAdmin(user)
        ? user.plantIds?.length
          ? { id: { in: user.plantIds } }
          : { id: -1 }
        : undefined,
      orderBy: { sortOrder: "asc" },
    });
  } catch (err) {
    plants = [];
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let dieselRate = 382.0;
  try {
    let fuelRateRecord = await prisma.monthlyFuelRate.findFirst({
      where: { periodMonth: currentMonthStr },
      orderBy: { periodMonth: "desc" },
    });
    if (!fuelRateRecord) {
      // Fallback to most recent recorded fuel rate
      fuelRateRecord = await prisma.monthlyFuelRate.findFirst({
        orderBy: { periodMonth: "desc" },
      });
    }
    if (fuelRateRecord) {
      dieselRate = Number(fuelRateRecord.dieselRate);
    }
  } catch (err) {
    dieselRate = 382.0;
  }

  return (
    <div className="w-full px-2 sm:px-3.5 py-2 space-y-3">
      <ExecutiveAnalyticsClient
        initialTrips={JSON.parse(JSON.stringify(trips))}
        initialRequests={JSON.parse(JSON.stringify(requests))}
        initialVehicles={JSON.parse(JSON.stringify(vehicles))}
        initialPlants={JSON.parse(JSON.stringify(plants))}
        dieselRate={dieselRate}
        currentMonth={currentMonthStr}
      />
    </div>
  );
}
