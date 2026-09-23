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

    const cleanNic = String(nic).trim().toUpperCase();

    // H-24: Validate NIC uniqueness
    const existingNic = await prisma.driver.findUnique({
      where: { nic: cleanNic },
    });
    if (existingNic) {
      return NextResponse.json(
        { message: `Driver with NIC ${cleanNic} already exists.` },
        { status: 409 }
      );
    }

    // H-24: Validate foreign keys
    let vehId: number | null = null;
    if (linkedVehicleId) {
      vehId = parseInt(linkedVehicleId, 10);
      if (!isNaN(vehId)) {
        const veh = await prisma.vehicle.findUnique({ where: { id: vehId } });
        if (!veh) {
          return NextResponse.json({ message: "Invalid linked vehicle ID: Vehicle not found." }, { status: 400 });
        }
      } else {
        vehId = null;
      }
    }

    let plantId: number | null = null;
    if (linkedPlantId) {
      plantId = parseInt(linkedPlantId, 10);
      if (!isNaN(plantId)) {
        const plant = await prisma.plant.findUnique({ where: { id: plantId } });
        if (!plant) {
          return NextResponse.json({ message: "Invalid linked plant ID: Plant not found." }, { status: 400 });
        }
      } else {
        plantId = null;
      }
    }

    let parsedExpiry: Date | null = null;
    if (licenseExpiry) {
      const d = new Date(licenseExpiry);
      if (!isNaN(d.getTime())) parsedExpiry = d;
    }

    const driver = await prisma.driver.create({
      data: {
        name: String(name).trim(),
        nic: cleanNic,
        mobile: String(mobile).trim(),
        licenseNumber: licenseNumber ? String(licenseNumber).trim() : "",
        licenseExpiry: parsedExpiry,
        linkedVehicleId: vehId,
        linkedPlantId: plantId,
        remarks: remarks ? String(remarks).trim() : null,
        status: "AVAILABLE",
        active: 1,
      },
      include: { linkedVehicle: true, linkedPlant: true },
    });

    return NextResponse.json({ status: "success", data: driver });
  } catch (error: any) {
    console.error("Create driver error:", error);
    return NextResponse.json({ message: error?.message || "Failed to create driver." }, { status: 500 });
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

    // H-12: Check if driver exists first to return proper 404
    const existingDriver = await prisma.driver.findUnique({
      where: { id: driverId },
    });
    if (!existingDriver) {
      return NextResponse.json({ message: "Driver not found." }, { status: 404 });
    }

    if (status && !ALLOWED_DRIVER_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Allowed statuses: ${ALLOWED_DRIVER_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate linked vehicle / plant if provided
    let vehId: number | null | undefined = undefined;
    if (linkedVehicleId !== undefined) {
      if (linkedVehicleId) {
        const v = parseInt(linkedVehicleId, 10);
        if (!isNaN(v)) {
          const veh = await prisma.vehicle.findUnique({ where: { id: v } });
          if (!veh) return NextResponse.json({ message: "Invalid linked vehicle ID." }, { status: 400 });
          vehId = v;
        } else {
          vehId = null;
        }
      } else {
        vehId = null;
      }
    }

    let plantId: number | null | undefined = undefined;
    if (linkedPlantId !== undefined) {
      if (linkedPlantId) {
        const p = parseInt(linkedPlantId, 10);
        if (!isNaN(p)) {
          const plant = await prisma.plant.findUnique({ where: { id: p } });
          if (!plant) return NextResponse.json({ message: "Invalid linked plant ID." }, { status: 400 });
          plantId = p;
        } else {
          plantId = null;
        }
      } else {
        plantId = null;
      }
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
        linkedVehicleId: vehId,
        linkedPlantId: plantId,
        remarks: remarks !== undefined ? (remarks ? String(remarks).trim() : null) : undefined,
        status: status || undefined,
      },
      include: { linkedVehicle: true, linkedPlant: true },
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    console.error("Update driver error:", error);
    if (error?.code === "P2025") {
      return NextResponse.json({ message: "Driver not found." }, { status: 404 });
    }
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

    // H-07 & H-12: Check driver exists and is not on an active trip before deactivating
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        deliveryTrips: {
          where: {
            status: { in: ["ASSIGNED", "READY_FOR_LOADING", "DISPATCHED", "IN_TRANSIT"] },
          },
          take: 1,
        },
      },
    });

    if (!driver) {
      return NextResponse.json({ message: "Driver not found." }, { status: 404 });
    }

    if (driver.status === "ON_TRIP" || driver.status === "ASSIGNED" || driver.deliveryTrips.length > 0) {
      return NextResponse.json(
        { message: `Cannot remove driver '${driver.name}' because they are currently assigned to an active trip.` },
        { status: 400 }
      );
    }

    await prisma.driver.update({
      where: { id: driverId },
      data: { active: 0, status: "OFF_DUTY" },
    });

    return NextResponse.json({ status: "success", message: "Driver removed" });
  } catch (error: any) {
    console.error("Delete driver error:", error);
    return NextResponse.json({ message: "Failed to remove driver." }, { status: 500 });
  }
}
