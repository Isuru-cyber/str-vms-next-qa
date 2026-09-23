import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi({ anyAction: ["view_routes", "view_allocations", "create_requests"] });
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const originIdStr = searchParams.get("origin_id");
    const locationIdStr = searchParams.get("location_id");
    const currentRouteIdStr = searchParams.get("current_route_id");

    const originId = Number(originIdStr);
    const locationId = Number(locationIdStr);
    const currentRouteId = currentRouteIdStr ? Number(currentRouteIdStr) : 0;

    if (
      !Number.isInteger(originId) ||
      originId <= 0 ||
      !Number.isInteger(locationId) ||
      locationId <= 0
    ) {
      return NextResponse.json({ success: false, distance_km: null });
    }

    // 1. First priority: look for direct route (1 delivery stop)
    const directRoute = await prisma.route.findFirst({
      where: {
        originLocationId: originId,
        active: 1,
        stops: {
          some: {
            locationId,
            stopSequence: 1,
            cumulativeDistanceKm: { gt: 0 },
          },
        },
      },
      include: {
        stops: {
          where: { stopSequence: { gt: 0 } },
        },
      },
    });

    if (directRoute && directRoute.stops.length === 1) {
      const stop = directRoute.stops[0];
      const km = Number(stop.cumulativeDistanceKm) || 0;
      if (km > 0) {
        const isSelf = currentRouteId > 0 && directRoute.id === currentRouteId;
        return NextResponse.json({
          success: true,
          is_direct: true,
          is_self: isSelf,
          distance_km: km,
          route_id: directRoute.id,
          route_code: directRoute.routeCode,
          route_name: directRoute.routeName,
          source_route: `${directRoute.routeCode} - ${directRoute.routeName}`,
        });
      }
    }

    // 2. Second priority: any route where origin is originId and has locationId (exclude directRoute if it had 0 km)
    const matchingRoute = await prisma.route.findFirst({
      where: {
        originLocationId: originId,
        id: directRoute ? { not: directRoute.id } : undefined,
        active: 1,
        stops: {
          some: {
            locationId,
            cumulativeDistanceKm: { gt: 0 },
          },
        },
      },
      include: {
        stops: {
          where: { locationId, cumulativeDistanceKm: { gt: 0 } },
        },
      },
    });

    if (matchingRoute && matchingRoute.stops.length > 0) {
      const stop = matchingRoute.stops[0];
      const km = Number(stop.cumulativeDistanceKm) || 0;
      if (km > 0) {
        const isSelf = currentRouteId > 0 && matchingRoute.id === currentRouteId;
        return NextResponse.json({
          success: true,
          is_direct: false,
          is_self: isSelf,
          distance_km: km,
          route_id: matchingRoute.id,
          route_code: matchingRoute.routeCode,
          route_name: matchingRoute.routeName,
          source_route: `${matchingRoute.routeCode} - ${matchingRoute.routeName}`,
        });
      }
    }

    return NextResponse.json({ success: false, distance_km: null });
  } catch (error: any) {
    console.error("Suggest distance error:", error);
    return NextResponse.json({ success: false, distance_km: null, error: "An internal error occurred." }, { status: 500 });
  }
}
