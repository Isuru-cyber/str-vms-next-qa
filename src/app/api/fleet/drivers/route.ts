import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { name, nic, mobile, licenseNumber, licenseExpiry, linkedVehicleId, linkedPlantId, remarks } = body;

    if (!name || !String(name).trim() || !nic || !String(nic).trim() || !mobile || !String(mobile).trim()) {
      return NextResponse.json(
        { message: "Driver name, NIC, and mobile number are required." },
        { status: 400 }
      );
    }

    let parsedExpiry: Date | null = null;
    if (licenseExpiry) {
      const d = new Date(licenseExpiry);
      if (!isNaN(d.getTime())) parsedExpiry = d;
    }

    const driver = await prisma.driver.create({
      data: {
        name: String(name).trim(),
        nic: String(nic).trim().toUpperCase(),
        mobile: String(mobile).trim(),
        licenseNumber: licenseNumber ? String(licenseNumber).trim() : "",
        licenseExpiry: parsedExpiry,
        linkedVehicleId: linkedVehicleId ? parseInt(linkedVehicleId, 10) : null,
        linkedPlantId: linkedPlantId ? parseInt(linkedPlantId, 10) : null,
        remarks: remarks ? String(remarks).trim() : null,
        status: "AVAILABLE",
        active: 1,
      },
      include: { linkedVehicle: true, linkedPlant: true },
    });

    return NextResponse.json({ status: "success", data: driver });
  } catch (error: any) {
    console.error("Create driver error:", error);
    return NextResponse.json({ message: "Failed to create driver." }, { status: 500 });
  }
}

const ALLOWED_DRIVER_STATUSES = ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "SUSPENDED", "ASSIGNED", "ON LEAVE"];

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id, name, nic, mobile, licenseNumber, licenseExpiry, linkedVehicleId, linkedPlantId, remarks, status } = body;

    const driverId = parseInt(id, 10);
    if (isNaN(driverId)) {
      return NextResponse.json({ message: "Invalid driver ID." }, { status: 400 });
    }

    if (status && !ALLOWED_DRIVER_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Allowed statuses: ${ALLOWED_DRIVER_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    let parsedExpiry: Date | undefined = undefined;
    if (licenseExpiry !== undefined) {
      if (licenseExpiry) {
        const d = new Date(licenseExpiry);
        if (!isNaN(d.getTime())) parsedExpiry = d;
      } else {
        parsedExpiry = undefined;
      }
    }

    const updated = await prisma.driver.update({
      where: { id: driverId },
      data: {
        name: name ? String(name).trim() : undefined,
        nic: nic ? String(nic).trim().toUpperCase() : undefined,
        mobile: mobile ? String(mobile).trim() : undefined,
        licenseNumber: licenseNumber !== undefined ? (licenseNumber ? String(licenseNumber).trim() : "") : undefined,
        licenseExpiry: parsedExpiry,
        linkedVehicleId: linkedVehicleId !== undefined ? (linkedVehicleId ? parseInt(linkedVehicleId, 10) : null) : undefined,
        linkedPlantId: linkedPlantId !== undefined ? (linkedPlantId ? parseInt(linkedPlantId, 10) : null) : undefined,
        remarks: remarks !== undefined ? (remarks ? String(remarks).trim() : null) : undefined,
        status: status || undefined,
      },
      include: { linkedVehicle: true, linkedPlant: true },
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    console.error("Update driver error:", error);
    return NextResponse.json({ message: "Failed to update driver." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const driverId = parseInt(id, 10);
    if (isNaN(driverId)) return NextResponse.json({ message: "Invalid driver ID." }, { status: 400 });

    await prisma.driver.update({
      where: { id: driverId },
      data: { active: 0 },
    });

    return NextResponse.json({ status: "success", message: "Driver removed" });
  } catch (error: any) {
    console.error("Delete driver error:", error);
    return NextResponse.json({ message: "Failed to remove driver." }, { status: 500 });
  }
}
