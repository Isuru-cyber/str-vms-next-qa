import React from "react";
import { prisma } from "@/lib/prisma";
import { RouteRegistry } from "@/components/routes/RouteRegistry";

export const dynamic = "force-dynamic";

export default async function RouteMasterPage() {
  let routes: any[] = [];
  let locations: any[] = [];

  try {
    const [dbRoutes, dbLocations] = await Promise.all([
      prisma.route.findMany({
        orderBy: { routeCode: "asc" },
        include: {
          originLocation: true,
          stops: {
            include: { location: true },
            orderBy: { stopSequence: "asc" },
          },
        },
      }),
      prisma.location.findMany({
        where: { active: 1 },
        orderBy: [{ isOrigin: "desc" }, { locationName: "asc" }],
        select: {
          id: true,
          locationName: true,
          businessGroup: true,
          locationType: true,
          isOrigin: true,
        },
      }),
    ]);

    routes = JSON.parse(JSON.stringify(dbRoutes));
    locations = JSON.parse(JSON.stringify(dbLocations));
  } catch (error) {
    console.error("Error loading routes master data:", error);
  }

  return <RouteRegistry initialRoutes={routes} locations={locations} />;
}
