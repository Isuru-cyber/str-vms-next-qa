import React from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin, can, canAccessPlant } from "@/lib/permissions";
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
  let companyName = "STR";
  let systemName = "Transport Management System";
  try {
    const [dbTrip, settings] = await Promise.all([
      prisma.deliveryTrip.findUnique({
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
      }),
      prisma.systemSetting.findMany({
        where: { settingKey: { in: ["COMPANY_NAME", "SYSTEM_NAME"] } },
      }),
    ]);

    if (settings && settings.length > 0) {
      const c = settings.find((s) => s.settingKey === "COMPANY_NAME")?.settingValue;
      if (c) companyName = c.trim();
      const sys = settings.find((s) => s.settingKey === "SYSTEM_NAME")?.settingValue;
      if (sys) systemName = sys.trim();
    }

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

  const canReopenTrip = can(user, "reopen_trips") || isAdmin(user);

  return (
    <TripManifestView
      trip={trip}
      companyName={companyName}
      systemName={systemName}
      canReopenTrip={canReopenTrip}
    />
  );
}
