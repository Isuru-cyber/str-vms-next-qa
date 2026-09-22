import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { TripsRegistry } from "@/components/trips/TripsRegistry";

export const dynamic = "force-dynamic";

export default async function TripsPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const where: any = {};
  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    where.tripRequests = {
      some: {
        request: {
          plantId: { in: user.plantIds },
        },
      },
    };
  }

  let trips: any[] = [];
  try {
    const dbTrips = await prisma.deliveryTrip.findMany({
      where,
      take: 200,
      orderBy: { id: "desc" },
      include: {
        vehicle: true,
        driver: true,
        route: true,
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
              },
            },
          },
          orderBy: { loadingSequence: "asc" },
        },
      },
    });

    trips = JSON.parse(JSON.stringify(dbTrips));
  } catch (error) {
    console.error("Error loading delivery trips:", error);
  }

  return <TripsRegistry initialTrips={trips} />;
}
