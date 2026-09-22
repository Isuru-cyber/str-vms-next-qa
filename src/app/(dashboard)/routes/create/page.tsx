import React from "react";
import { prisma } from "@/lib/prisma";
import { RouteCreatePageClient } from "@/components/routes/RouteCreatePageClient";

export const dynamic = "force-dynamic";

export default async function RouteCreatePage({
  searchParams,
}: {
  searchParams: Promise<{
    origin_id?: string;
    stop_ids?: string;
    bg?: string;
    return_to?: string;
  }>;
}) {
  const params = await searchParams;

  let locations: any[] = [];
  let operations: any[] = [];
  let routes: any[] = [];

  try {
    const [dbLocations, dbOperations, dbRoutes] = await Promise.all([
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
      prisma.operation.findMany({
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      prisma.route.findMany({
        select: {
          id: true,
          routeCode: true,
        },
      }),
    ]);

    locations = JSON.parse(JSON.stringify(dbLocations));
    operations = JSON.parse(JSON.stringify(dbOperations));
    routes = JSON.parse(JSON.stringify(dbRoutes));
  } catch (err) {
    console.error("Error loading route create dependencies:", err);
  }

  // Determine next route code matching PHP logic (RTE-XXXX)
  let maxNum = 0;
  for (const r of routes) {
    if (r.routeCode && r.routeCode.startsWith("RTE-")) {
      const num = parseInt(r.routeCode.replace("RTE-", ""), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextNum = Math.max(maxNum, routes.length) + 1;
  const nextRouteCode = `RTE-${String(nextNum).padStart(4, "0")}`;

  return (
    <RouteCreatePageClient
      locations={locations}
      operations={operations}
      defaultRouteCode={nextRouteCode}
      initialOriginId={params.origin_id || ""}
      initialStopIds={params.stop_ids || ""}
      initialBg={params.bg || ""}
      returnTo={params.return_to || ""}
    />
  );
}
