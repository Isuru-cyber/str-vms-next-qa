import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

// Location alias mapping for duplicate / synonym master locations
const LOCATION_ALIASES: Record<number, number[]> = {
  153: [153, 197],
  197: [153, 197],
  100: [100, 193],
  193: [100, 193],
  94: [94, 173],
  173: [94, 173],
  155: [155, 160],
  160: [155, 160],
};

function getAliases(id: number): number[] {
  return LOCATION_ALIASES[id] || [id];
}

function matchesAnyAlias(locId: number, targetId: number): boolean {
  const aliases = getAliases(targetId);
  return aliases.includes(locId);
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const { searchParams } = new URL(req.url);
    const fromIdStr = searchParams.get("from_id");
    const toIdsStr = searchParams.get("to_ids");
    const toIdStr = searchParams.get("to_id");

    if (!fromIdStr) {
      return NextResponse.json([]);
    }

    const fromId = Number(fromIdStr);
    if (isNaN(fromId) || fromId <= 0) {
      return NextResponse.json([]);
    }

    // Extract target destination IDs
    let targetToIds: number[] = [];
    if (toIdsStr) {
      targetToIds = Array.from(
        new Set(
          toIdsStr
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => !isNaN(n) && n > 0)
        )
      );
    } else if (toIdStr) {
      const tId = Number(toIdStr);
      if (!isNaN(tId) && tId > 0) {
        targetToIds = [tId];
      }
    }

    if (targetToIds.length === 0) {
      return NextResponse.json([]);
    }

    // Find all active routes starting from fromId
    const candidateRoutes = await prisma.route.findMany({
      where: {
        originLocationId: fromId,
        active: 1,
      },
      include: {
        stops: {
          where: { stopSequence: { gt: 0 } },
          orderBy: { stopSequence: "asc" },
        },
      },
    });

    // Helper to calculate route total distance
    const getRouteDistance = (r: any): number => {
      const maxStopDist =
        r.stops && r.stops.length > 0
          ? Math.max(...r.stops.map((s: any) => Number(s.cumulativeDistanceKm) || 0))
          : 0;
      return Number(r.totalDistanceKm) > 0 ? Number(r.totalDistanceKm) : maxStopDist;
    };

    // 1. Single Destination Request (Direct Corridor Route Matching)
    if (targetToIds.length === 1) {
      const targetId = targetToIds[0];

      // A. Priority 1: Direct 1-stop routes (Origin -> Destination only, no other stops)
      const directMatches: any[] = [];
      // B. Priority 2: Terminating routes (stops ending at Destination)
      const terminatingMatches: any[] = [];

      for (const r of candidateRoutes) {
        if (!r.stops || r.stops.length === 0) continue;

        const lastStop = r.stops[r.stops.length - 1];
        const isEndAtTarget = matchesAnyAlias(Number(lastStop.locationId), targetId);

        if (isEndAtTarget) {
          const totalDistance = getRouteDistance(r);
          const item = {
            id: r.id,
            route_name: r.routeName,
            route_code: r.routeCode,
            total_distance: totalDistance,
            total_distance_km: totalDistance,
            is_exact: true,
            stops_count: r.stops.length,
          };

          if (r.stops.length === 1) {
            directMatches.push(item);
          } else {
            terminatingMatches.push(item);
          }
        }
      }

      // If direct 1-stop routes exist, return ONLY direct routes!
      // This prevents confusing multi-stop routes when a pure direct corridor exists.
      if (directMatches.length > 0) {
        directMatches.sort((a, b) => a.total_distance - b.total_distance);
        return NextResponse.json(directMatches);
      }

      // If no 1-stop direct route exists, return the route(s) terminating at target with the fewest stops
      if (terminatingMatches.length > 0) {
        terminatingMatches.sort((a, b) => {
          if (a.stops_count !== b.stops_count) return a.stops_count - b.stops_count;
          return a.total_distance - b.total_distance;
        });
        const minStops = terminatingMatches[0].stops_count;
        const bestTerminating = terminatingMatches.filter((m) => m.stops_count === minStops);
        return NextResponse.json(bestTerminating);
      }

      // No route reaches this destination from the origin
      return NextResponse.json([]);
    }

    // 2. Multiple Destination Requests (Combined Routes Matching)
    const exactCombineMatches: any[] = [];

    for (const r of candidateRoutes) {
      if (!r.stops || r.stops.length === 0) continue;

      const routeLocIds: number[] = Array.from(
        new Set(
          r.stops
            .map((s: any) => Number(s.locationId))
            .filter((id: number) => !isNaN(id) && id > 0)
        )
      );

      // Check if every target destination is covered by a stop in the route
      const hasAllTargets = targetToIds.every((tId: number) =>
        routeLocIds.some((rId: number) => matchesAnyAlias(rId, tId))
      );

      // Check if all route stops are for requested destinations (no extra intermediate stops)
      const noExtraStops = routeLocIds.every((rId: number) =>
        targetToIds.some((tId: number) => matchesAnyAlias(rId, tId))
      );

      if (hasAllTargets && noExtraStops) {
        const totalDistance = getRouteDistance(r);
        exactCombineMatches.push({
          id: r.id,
          route_name: r.routeName,
          route_code: r.routeCode,
          total_distance: totalDistance,
          total_distance_km: totalDistance,
          is_exact: true,
        });
      }
    }

    // Combine Suggestion: route stops must match requested destinations exactly (no extra stops, no missing stops)
    if (exactCombineMatches.length > 0) {
      exactCombineMatches.sort((a, b) => a.total_distance - b.total_distance);
      return NextResponse.json(exactCombineMatches);
    }

    return NextResponse.json([]);
  } catch (error: any) {
    console.error("Error suggesting routes:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
