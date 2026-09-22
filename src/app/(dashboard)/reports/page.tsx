import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ReportsHubClient } from "@/components/reports/ReportsHubClient";

export const metadata = {
  title: "Data Reports | STR-VMS",
  description: "Comprehensive operational data reports, vehicle statements, plant cost share, and Excel exports.",
};

export default async function ReportsPage() {
  await getSession();

  let trips: any[] = [];
  try {
    trips = await prisma.deliveryTrip.findMany({
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
      where: { active: 1 },
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
      orderBy: { sortOrder: "asc" },
    });
  } catch (err) {
    plants = [];
  }

  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  let dieselRate = 382.0;
  try {
    const fuelRateRecord = await prisma.monthlyFuelRate.findFirst({
      where: { periodMonth: currentMonthStr },
      orderBy: { periodMonth: "desc" },
    });
    if (fuelRateRecord) {
      dieselRate = Number(fuelRateRecord.dieselRate);
    }
  } catch (err) {
    dieselRate = 382.0;
  }

  return (
    <div className="w-full px-2 sm:px-3.5 py-2 space-y-2">
      <ReportsHubClient
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
