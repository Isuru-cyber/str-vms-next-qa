import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin, canAccessPlant } from "@/lib/permissions";
import { TripManifestView } from "@/components/trips/TripManifestView";

export const dynamic = "force-dynamic";

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const tripId = parseInt(resolvedParams.id, 10);
  if (!tripId) {
    notFound();
  }

  let trip: any = null;
  try {
    const dbTrip = await prisma.deliveryTrip.findUnique({
      where: { id: tripId },
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
            stops: {
              include: { location: true },
              orderBy: { stopSequence: "asc" },
            },
          },
        },
        tripRequests: {
          include: {
            request: {
              include: {
                plant: true,
                fromLocation: true,
                toLocation: true,
                requester: {
                  select: { id: true, name: true, email: true, userCode: true },
                },
                subOperation: true,
              },
            },
          },
          orderBy: { loadingSequence: "asc" },
        },
        gatePasses: {
          orderBy: { id: "asc" },
        },
        reconciliations: {
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    if (dbTrip) {
      trip = JSON.parse(JSON.stringify(dbTrip));
    }
  } catch (error) {
    console.error("Error loading trip manifest:", error);
  }

  if (!trip) {
    notFound();
  }

  // Authorization Check: Non-admins must have access to at least one plant in the trip
  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    const hasPlantAccess = trip.tripRequests?.some(
      (tr: any) => tr.request && canAccessPlant(user, tr.request.plantId)
    );
    if (!hasPlantAccess && trip.tripRequests?.length > 0) {
      notFound();
    }
  }

  return <TripManifestView trip={trip} />;
}
