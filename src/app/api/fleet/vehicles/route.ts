import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET() {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const vehicles = await prisma.vehicle.findMany({
      where: { active: 1 },
      orderBy: { vehicleNumber: "asc" },
      include: { defaultLocation: true },
    });

    return NextResponse.json({ status: "success", data: vehicles });
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to fetch vehicles." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      vehicleNumber,
      vehicleType,
      paymentBasis = "KM_BASED",
      fuelConsumptionKml = 10,
      runningCostPerKm = 20.5,
      profitPerKm = 15,
      fixedCostPerDay = 1795.36,
      monthlyFixedRate = 0,
      extraKmRate = 0,
      monthlyKmLimit = 0,
      maxPayloadKg = 1000,
      maxVolumeCbm = 10,
      defaultLocationId,
      operationCategoryId,
    } = body;

    if (!vehicleNumber || !String(vehicleNumber).trim() || !vehicleType || !String(vehicleType).trim()) {
      return NextResponse.json(
        { message: "Vehicle Number and Vehicle Type are required." },
        { status: 400 }
      );
    }

    const created = await prisma.vehicle.create({
      data: {
        vehicleNumber: String(vehicleNumber).trim(),
        vehicleType: String(vehicleType).trim(),
        paymentBasis,
        fuelConsumptionKml: parseFloat(fuelConsumptionKml) || 0,
        runningCostPerKm: parseFloat(runningCostPerKm) || 0,
        profitPerKm: parseFloat(profitPerKm) || 0,
        fixedCostPerDay: parseFloat(fixedCostPerDay) || 0,
        monthlyFixedRate: parseFloat(monthlyFixedRate) || 0,
        extraKmRate: parseFloat(extraKmRate) || 0,
        monthlyKmLimit: parseInt(monthlyKmLimit, 10) || 0,
        maxPayloadKg: parseFloat(maxPayloadKg) || 0,
        maxVolumeCbm: parseFloat(maxVolumeCbm) || 0,
        defaultLocationId: defaultLocationId ? parseInt(defaultLocationId, 10) : null,
        operationCategoryId: operationCategoryId ? parseInt(operationCategoryId, 10) : null,
        status: "AVAILABLE",
        active: 1,
      },
    });

    return NextResponse.json({ status: "success", data: created });
  } catch (error: any) {
    console.error("Create vehicle error:", error);
    return NextResponse.json({ message: "Failed to create vehicle." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id, ...data } = body;

    const vehId = parseInt(id, 10);
    if (isNaN(vehId)) {
      return NextResponse.json({ message: "Invalid vehicle ID." }, { status: 400 });
    }

    // Whitelist allowed fields to prevent mass assignment
    const updateData: any = {};
    if (data.vehicleNumber !== undefined) updateData.vehicleNumber = String(data.vehicleNumber).trim();
    if (data.vehicleType !== undefined) updateData.vehicleType = String(data.vehicleType).trim();
    if (data.paymentBasis !== undefined) updateData.paymentBasis = data.paymentBasis;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.active !== undefined) updateData.active = data.active ? 1 : 0;
    if (data.defaultLocationId !== undefined) {
      updateData.defaultLocationId = data.defaultLocationId ? parseInt(data.defaultLocationId, 10) : null;
    }
    if (data.operationCategoryId !== undefined) {
      updateData.operationCategoryId = data.operationCategoryId ? parseInt(data.operationCategoryId, 10) : null;
    }
    if (data.fuelConsumptionKml !== undefined) updateData.fuelConsumptionKml = parseFloat(data.fuelConsumptionKml) || 0;
    if (data.runningCostPerKm !== undefined) updateData.runningCostPerKm = parseFloat(data.runningCostPerKm) || 0;
    if (data.profitPerKm !== undefined) updateData.profitPerKm = parseFloat(data.profitPerKm) || 0;
    if (data.fixedCostPerDay !== undefined) updateData.fixedCostPerDay = parseFloat(data.fixedCostPerDay) || 0;
    if (data.monthlyFixedRate !== undefined) updateData.monthlyFixedRate = parseFloat(data.monthlyFixedRate) || 0;
    if (data.extraKmRate !== undefined) updateData.extraKmRate = parseFloat(data.extraKmRate) || 0;
    if (data.monthlyKmLimit !== undefined) updateData.monthlyKmLimit = parseInt(data.monthlyKmLimit, 10) || 0;
    if (data.maxPayloadKg !== undefined) updateData.maxPayloadKg = parseFloat(data.maxPayloadKg) || 0;
    if (data.maxVolumeCbm !== undefined) updateData.maxVolumeCbm = parseFloat(data.maxVolumeCbm) || 0;

    const updated = await prisma.vehicle.update({
      where: { id: vehId },
      data: updateData,
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    console.error("Update vehicle error:", error);
    return NextResponse.json({ message: "Failed to update vehicle record." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_fleet" });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const vehId = parseInt(id, 10);
    if (isNaN(vehId)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

    await prisma.vehicle.update({
      where: { id: vehId },
      data: { active: 0 },
    });

    return NextResponse.json({ status: "success", message: "Vehicle removed" });
  } catch (error: any) {
    console.error("Delete vehicle error:", error);
    return NextResponse.json({ message: "Failed to remove vehicle." }, { status: 500 });
  }
}
