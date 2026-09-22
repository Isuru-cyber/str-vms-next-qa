import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permission-utils";
import { LiveMapWrapper } from "@/components/map/LiveMapWrapper";

export default async function LiveMapPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!can(user, "view_map")) {
    redirect("/");
  }

  let mappedLocations: any[] = [];
  let unmappedLocations: any[] = [];
  let activeTrips: any[] = [];
  let consolidationPoints: any[] = [];

  const tripWhere: any = {
    status: { in: ["ASSIGNED", "READY_FOR_LOADING", "GATE_PASS_ISSUED", "DISPATCHED", "IN_TRANSIT"] },
  };
  const reqWhere: any = {
    status: "SUBMITTED",
    toLocation: {
      latitude: { not: null },
      longitude: { not: null },
    },
  };

  if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
    tripWhere.tripRequests = {
      some: {
        request: {
          plantId: { in: user.plantIds },
        },
      },
    };
    reqWhere.plantId = { in: user.plantIds };
  } else if (!isAdmin(user) && (!user.plantIds || user.plantIds.length === 0)) {
    tripWhere.id = -1;
    reqWhere.id = -1;
  }

  try {
    const [allLocs, trips, pendingReqs] = await Promise.all([
      prisma.location.findMany({
        where: { active: 1 },
        orderBy: { locationName: "asc" },
      }),
      prisma.deliveryTrip.findMany({
        where: tripWhere,
        include: {
          vehicle: true,
          driver: true,
          route: {
            include: {
              stops: {
                include: { location: true },
                orderBy: { stopSequence: "asc" },
              },
            },
          },
        },
      }),
      prisma.vehicleRequest.findMany({
        where: reqWhere,
        include: {
          toLocation: true,
        },
      }),
    ]);

    // Split mapped vs unmapped
    allLocs.forEach((loc: any) => {
      if (loc.latitude !== null && loc.longitude !== null) {
        mappedLocations.push({
          id: loc.id,
          locationName: loc.locationName,
          locationType: loc.locationType,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
        });
      } else {
        unmappedLocations.push({
          id: loc.id,
          locationName: loc.locationName,
        });
      }
    });

    // Format active trips with coordinates
    activeTrips = trips.map((t: any) => {
      const stops = t.route?.stops || [];
      const coords = stops
        .filter(
          (s: any) =>
            s.location?.latitude !== null &&
            s.location?.longitude !== null &&
            s.location?.latitude !== undefined &&
            s.location?.longitude !== undefined
        )
        .map((s: any) => ({
          lat: Number(s.location.latitude),
          lng: Number(s.location.longitude),
          name: s.location.locationName,
        }));

      return {
        id: t.id,
        tripNo: t.tripNo,
        status: t.status,
        vehicleNumber: t.vehicle?.vehicleNumber || "-",
        vehicleType: t.vehicle?.vehicleType || "-",
        driverName: t.driver?.name || "-",
        routeName: t.route?.routeName || "Consolidated Corridor",
        coords,
      };
    });

    // Group pending requests by destination for consolidation points
    const cpMap = new Map<number, any>();
    pendingReqs.forEach((r: any) => {
      const loc = r.toLocation;
      if (!loc || loc.latitude === null || loc.longitude === null) return;
      if (!cpMap.has(loc.id)) {
        cpMap.set(loc.id, {
          locationId: loc.id,
          locationName: loc.locationName,
          latitude: Number(loc.latitude),
          longitude: Number(loc.longitude),
          requestCount: 0,
          totalCbm: 0,
          totalKg: 0,
        });
      }
      const item = cpMap.get(loc.id);
      item.requestCount += 1;
      item.totalCbm += Number(r.requiredCbm) || 0;
      item.totalKg += Number(r.requiredKg) || 0;
    });

    consolidationPoints = Array.from(cpMap.values());
  } catch (err) {
    console.error("Failed to load map data:", err);
  }

  return (
    <div className="w-full min-h-0">
      <LiveMapWrapper
        mappedLocations={mappedLocations}
        unmappedLocations={unmappedLocations}
        activeTrips={activeTrips}
        consolidationPoints={consolidationPoints}
      />
    </div>
  );
}
