import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: any = {
      ownershipType: "ADHOC",
    };
    if (!includeInactive) {
      where.active = 1;
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        drivers: {
          where: includeInactive ? undefined : { active: 1 },
          orderBy: { id: "desc" },
          take: 1,
        },
      },
    });

    return NextResponse.json({ status: "success", data: vehicles });
  } catch (error: any) {
    console.error("Fetch ad-hoc vehicles error:", error);
    return NextResponse.json({ message: "Failed to fetch ad-hoc vehicles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const {
      transporterName,
      vehicleNumber,
      vehicleCategory,
      driverName,
      driverMobile,
      driverNic,
    } = body;

    const cleanVehNo = String(vehicleNumber || "").trim().toUpperCase();
    const cleanCategory = String(vehicleCategory || "Lorry").trim();
    const cleanTransporter = String(transporterName || "").trim();
    const cleanDriverName = String(driverName || "").trim();
    const cleanMobile = String(driverMobile || "").trim();
    const cleanNic = String(driverNic || "").trim();

    if (!cleanVehNo || !cleanDriverName) {
      return NextResponse.json(
        { message: "Vehicle Number and Driver Name are required." },
        { status: 400 }
      );
    }

    // Check if vehicleNumber is already used by an active vehicle
    const existingVeh = await prisma.vehicle.findUnique({
      where: { vehicleNumber: cleanVehNo },
    });

    if (existingVeh && existingVeh.active === 1) {
      return NextResponse.json(
        { message: `Vehicle ${cleanVehNo} is already registered in the system.` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      let vehicle: any;

      if (existingVeh) {
        vehicle = await tx.vehicle.update({
          where: { id: existingVeh.id },
          data: {
            ownershipType: "ADHOC",
            paymentBasis: "ADHOC",
            vehicleCategory: cleanCategory,
            vehicleType: cleanCategory,
            transporterName: cleanTransporter || null,
            status: "AVAILABLE",
            active: 1,
          },
        });
      } else {
        vehicle = await tx.vehicle.create({
          data: {
            vehicleNumber: cleanVehNo,
            vehicleType: cleanCategory,
            vehicleCategory: cleanCategory,
            ownershipType: "ADHOC",
            paymentBasis: "ADHOC",
            transporterName: cleanTransporter || null,
            status: "AVAILABLE",
            active: 1,
            fuelConsumptionKml: 0,
            runningCostPerKm: 0,
            profitPerKm: 0,
            fixedCostPerDay: 0,
          },
        });
      }

      // Check or create Driver
      const finalNic = cleanNic || `ADHOC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;
      let driver = await tx.driver.findFirst({
        where: { nic: finalNic },
      });

      if (driver) {
        driver = await tx.driver.update({
          where: { id: driver.id },
          data: {
            name: cleanDriverName,
            mobile: cleanMobile || driver.mobile,
            linkedVehicleId: vehicle.id,
            driverType: "ADHOC",
            status: "AVAILABLE",
            active: 1,
          },
        });
      } else {
        driver = await tx.driver.create({
          data: {
            name: cleanDriverName,
            nic: finalNic,
            mobile: cleanMobile || "N/A",
            licenseNumber: "N/A",
            linkedVehicleId: vehicle.id,
            driverType: "ADHOC",
            status: "AVAILABLE",
            active: 1,
          },
        });
      }

      return { vehicle, driver };
    });

    await ActivityLogger.log(
      "FLEET",
      "CREATE_ADHOC_VEHICLE",
      result.vehicle.vehicleNumber,
      `Registered Ad-Hoc outside vehicle ${result.vehicle.vehicleNumber} (${cleanCategory}) | Transporter: ${cleanTransporter || "N/A"} | Driver: ${cleanDriverName}`,
      user.id
    );

    return NextResponse.json({ status: "success", data: result });
  } catch (error: any) {
    console.error("Create ad-hoc vehicle error:", error);
    return NextResponse.json({ message: error.message || "Failed to register ad-hoc vehicle." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const {
      id,
      transporterName,
      vehicleNumber,
      vehicleCategory,
      driverName,
      driverMobile,
      driverNic,
      status,
      active,
    } = body;

    const vehId = parseInt(id, 10);
    if (!vehId || isNaN(vehId)) {
      return NextResponse.json({ message: "Invalid vehicle ID." }, { status: 400 });
    }

    const cleanVehNo = vehicleNumber ? String(vehicleNumber).trim().toUpperCase() : undefined;
    const cleanCategory = vehicleCategory ? String(vehicleCategory).trim() : undefined;
    const cleanTransporter = transporterName !== undefined ? String(transporterName).trim() : undefined;

    const result = await prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (cleanVehNo) updateData.vehicleNumber = cleanVehNo;
      if (cleanCategory) {
        updateData.vehicleCategory = cleanCategory;
        updateData.vehicleType = cleanCategory;
      }
      if (cleanTransporter !== undefined) updateData.transporterName = cleanTransporter || null;
      if (status) updateData.status = status;
      if (active !== undefined) updateData.active = active ? 1 : 0;

      const vehicle = await tx.vehicle.update({
        where: { id: vehId },
        data: updateData,
        include: {
          drivers: { take: 1 },
        },
      });

      // Update linked driver if provided
      let driver = vehicle.drivers[0];
      if (driver && (driverName || driverMobile || driverNic)) {
        driver = await tx.driver.update({
          where: { id: driver.id },
          data: {
            name: driverName ? String(driverName).trim() : driver.name,
            mobile: driverMobile ? String(driverMobile).trim() : driver.mobile,
            nic: driverNic ? String(driverNic).trim() : driver.nic,
          },
        });
      }

      return { vehicle, driver };
    });

    await ActivityLogger.log(
      "FLEET",
      "UPDATE_ADHOC_VEHICLE",
      result.vehicle.vehicleNumber,
      `Updated Ad-Hoc outside vehicle ${result.vehicle.vehicleNumber}`,
      user.id
    );

    return NextResponse.json({ status: "success", data: result });
  } catch (error: any) {
    console.error("Update ad-hoc vehicle error:", error);
    return NextResponse.json({ message: error.message || "Failed to update ad-hoc vehicle." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ message: "Invalid vehicle ID." }, { status: 400 });
    }

    const veh = await prisma.vehicle.findUnique({
      where: { id },
      include: { drivers: true },
    });
    if (!veh) {
      return NextResponse.json({ message: "Vehicle not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.vehicle.update({
        where: { id },
        data: { active: 0, status: "INACTIVE" },
      });

      for (const d of veh.drivers) {
        await tx.driver.update({
          where: { id: d.id },
          data: { active: 0, status: "INACTIVE" },
        });
      }
    });

    await ActivityLogger.log(
      "FLEET",
      "DEACTIVATE_ADHOC_VEHICLE",
      veh.vehicleNumber,
      `Deactivated Ad-Hoc vehicle ${veh.vehicleNumber}`,
      user.id
    );

    return NextResponse.json({ status: "success", message: "Ad-hoc vehicle deactivated successfully." });
  } catch (error: any) {
    console.error("Delete ad-hoc vehicle error:", error);
    return NextResponse.json({ message: error.message || "Failed to deactivate ad-hoc vehicle." }, { status: 500 });
  }
}
