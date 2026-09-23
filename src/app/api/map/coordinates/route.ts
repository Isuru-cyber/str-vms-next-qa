import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_locations" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { id, lat, lng } = body;

    const locationId = Number(id);
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (
      isNaN(locationId) ||
      !Number.isInteger(locationId) ||
      locationId <= 0 ||
      isNaN(latitude) ||
      isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid location ID and geographic coordinates (latitude ±90, longitude ±180) are required.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.location.update({
      where: { id: locationId },
      data: {
        latitude,
        longitude,
      },
    });

    await ActivityLogger.log(
      "MASTER_DATA",
      "UPDATE_LOCATION_COORDS",
      updated.locationName,
      `Updated coordinates for ${updated.locationName} to [${latitude}, ${longitude}]`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Coordinates for ${updated.locationName} saved successfully.`,
      location: {
        id: updated.id,
        locationName: updated.locationName,
        latitude: updated.latitude,
        longitude: updated.longitude,
      },
    });
  } catch (err: any) {
    console.error("Update coordinates error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Operation failed." },
      { status: 500 }
    );
  }
}
