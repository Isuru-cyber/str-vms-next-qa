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

    if (isNaN(locationId) || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { success: false, message: "Valid location ID, latitude, and longitude are required." },
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
      location: updated,
    });
  } catch (err: any) {
    console.error("Update coordinates error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Operation failed." },
      { status: 500 }
    );
  }
}
