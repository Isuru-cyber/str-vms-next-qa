import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const bg = searchParams.get("bg");
    const where: any = {};
    if (bg && bg !== "ALL") {
      where.businessGroup = bg;
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: { locationName: "asc" },
      include: { plant: true },
    });

    return NextResponse.json({ status: "success", data: locations });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_locations" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      locationName,
      businessGroup = "ELASTIC",
      code,
      locationType = "CUSTOMER",
      plantId,
      isOrigin,
      latitude,
      longitude,
      active = 1,
    } = body;

    if (!locationName || !locationName.trim()) {
      return NextResponse.json({ message: "Location Name is required" }, { status: 400 });
    }

    const originFlag = isOrigin !== undefined ? (isOrigin ? 1 : 0) : locationType === "PLANT" ? 1 : 0;

    const loc = await prisma.location.create({
      data: {
        locationName: locationName.trim(),
        businessGroup: businessGroup || "ELASTIC",
        code: code ? code.trim().toUpperCase() : null,
        locationType: locationType || "CUSTOMER",
        plantId: plantId ? parseInt(String(plantId), 10) : null,
        isOrigin: originFlag,
        latitude: latitude ? parseFloat(String(latitude)) : null,
        longitude: longitude ? parseFloat(String(longitude)) : null,
        active: active ? 1 : 0,
      },
      include: { plant: true },
    });

    return NextResponse.json({ status: "success", data: loc });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_locations" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      id,
      locationName,
      businessGroup,
      code,
      locationType,
      plantId,
      isOrigin,
      latitude,
      longitude,
      active,
    } = body;

    if (!id) {
      return NextResponse.json({ message: "Location ID is required" }, { status: 400 });
    }

    const locId = parseInt(String(id), 10);
    const originFlag = isOrigin !== undefined ? (isOrigin ? 1 : 0) : locationType === "PLANT" ? 1 : 0;

    const updated = await prisma.location.update({
      where: { id: locId },
      data: {
        locationName: locationName ? locationName.trim() : undefined,
        businessGroup: businessGroup !== undefined ? businessGroup : undefined,
        code: code !== undefined ? (code ? code.trim().toUpperCase() : null) : undefined,
        locationType: locationType !== undefined ? locationType : undefined,
        plantId: plantId !== undefined ? (plantId ? parseInt(String(plantId), 10) : null) : undefined,
        isOrigin: originFlag,
        latitude: latitude !== undefined ? (latitude ? parseFloat(String(latitude)) : null) : undefined,
        longitude: longitude !== undefined ? (longitude ? parseFloat(String(longitude)) : null) : undefined,
        active: active !== undefined ? (active ? 1 : 0) : undefined,
      },
      include: { plant: true },
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_locations" });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const locId = parseInt(idStr, 10);

    // Check if location is referenced in historical records (Trips, Requests, Routes, Vehicles)
    const [reqCount, routeStopCount, originRouteCount, vehicleCount] = await Promise.all([
      prisma.vehicleRequest.count({
        where: {
          OR: [{ fromLocationId: locId }, { toLocationId: locId }],
        },
      }),
      prisma.routeStop.count({
        where: { locationId: locId },
      }),
      prisma.route.count({
        where: { originLocationId: locId },
      }),
      prisma.vehicle.count({
        where: { defaultLocationId: locId },
      }),
    ]);

    const isReferenced = reqCount > 0 || routeStopCount > 0 || originRouteCount > 0 || vehicleCount > 0;

    if (isReferenced) {
      // Safely archive
      const archived = await prisma.location.update({
        where: { id: locId },
        data: { active: 0 },
        include: { plant: true },
      });
      return NextResponse.json({
        status: "archived",
        message: "Location safely archived to protect historical trip sheets and routes.",
        data: archived,
      });
    }

    try {
      await prisma.location.delete({
        where: { id: locId },
      });
      return NextResponse.json({
        status: "deleted",
        message: "Location permanently deleted.",
        id: locId,
      });
    } catch {
      const archived = await prisma.location.update({
        where: { id: locId },
        data: { active: 0 },
        include: { plant: true },
      });
      return NextResponse.json({
        status: "archived",
        message: "Location safely archived.",
        data: archived,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
