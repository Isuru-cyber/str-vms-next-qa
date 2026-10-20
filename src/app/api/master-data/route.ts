import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const cat = searchParams.get("category") || "VEHICLE_TYPE";

    const items = await prisma.masterData.findMany({
      where: {
        category: { code: cat },
      },
      orderBy: { sortOrder: "asc" },
      include: { category: true },
    });

    return NextResponse.json({ status: "success", data: items });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // S-7: Master Data editing is hard-denied to everyone except Super Admin in PHP VMS
    const auth = await authorizeApi({ superAdminOnly: true, action: "edit_master_data" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      categoryCode,
      code,
      name,
      defaultFuelConsumption,
      defaultRunningCostPerKm,
      defaultProfitPerKm,
      defaultFixedCostPerDay,
      sortOrder,
      active,
    } = body;

    const cat = await prisma.masterCategory.findUnique({
      where: { code: categoryCode },
    });
    if (!cat) return NextResponse.json({ message: "Category not found" }, { status: 404 });

    const item = await prisma.masterData.create({
      data: {
        categoryId: cat.id,
        code: (code && code.trim())
          ? code.trim().toUpperCase()
          : (name || "")
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 30),
        name,
        defaultFuelConsumption:
          defaultFuelConsumption !== undefined && defaultFuelConsumption !== null && defaultFuelConsumption !== ""
            ? parseFloat(defaultFuelConsumption)
            : null,
        defaultRunningCostPerKm:
          defaultRunningCostPerKm !== undefined && defaultRunningCostPerKm !== null && defaultRunningCostPerKm !== ""
            ? parseFloat(defaultRunningCostPerKm)
            : null,
        defaultProfitPerKm:
          defaultProfitPerKm !== undefined && defaultProfitPerKm !== null && defaultProfitPerKm !== ""
            ? parseFloat(defaultProfitPerKm)
            : 15.0,
        defaultFixedCostPerDay:
          defaultFixedCostPerDay !== undefined && defaultFixedCostPerDay !== null && defaultFixedCostPerDay !== ""
            ? parseFloat(defaultFixedCostPerDay)
            : 1795.36,
        sortOrder: sortOrder ? parseInt(sortOrder, 10) : 10,
        active: active !== undefined ? (active ? 1 : 0) : 1,
      },
    });

    return NextResponse.json({ status: "success", data: item });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ superAdminOnly: true, action: "edit_master_data" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const {
      id,
      name,
      code,
      defaultFuelConsumption,
      defaultRunningCostPerKm,
      defaultProfitPerKm,
      defaultFixedCostPerDay,
      sortOrder,
      active,
    } = body;

    const updated = await prisma.masterData.update({
      where: { id: parseInt(id, 10) },
      data: {
        name,
        code: (code && code.trim())
          ? code.trim().toUpperCase()
          : (name || "")
              .trim()
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 30),
        defaultFuelConsumption:
          defaultFuelConsumption !== undefined
            ? defaultFuelConsumption !== null && defaultFuelConsumption !== ""
              ? parseFloat(defaultFuelConsumption)
              : null
            : undefined,
        defaultRunningCostPerKm:
          defaultRunningCostPerKm !== undefined
            ? defaultRunningCostPerKm !== null && defaultRunningCostPerKm !== ""
              ? parseFloat(defaultRunningCostPerKm)
              : null
            : undefined,
        defaultProfitPerKm:
          defaultProfitPerKm !== undefined
            ? defaultProfitPerKm !== null && defaultProfitPerKm !== ""
              ? parseFloat(defaultProfitPerKm)
              : null
            : undefined,
        defaultFixedCostPerDay:
          defaultFixedCostPerDay !== undefined
            ? defaultFixedCostPerDay !== null && defaultFixedCostPerDay !== ""
              ? parseFloat(defaultFixedCostPerDay)
              : null
            : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder, 10) : undefined,
        active: active !== undefined ? (active ? 1 : 0) : undefined,
      },
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ superAdminOnly: true, action: "edit_master_data" });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const force = searchParams.get("force") === "true";
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const itemId = parseInt(id, 10);
    const masterItem = await prisma.masterData.findUnique({
      where: { id: itemId },
      include: { category: true },
    });

    if (!masterItem) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 });
    }

    if (!force) {
      let assignedCount = 0;
      let targetEntity = "";

      if (masterItem.category.code === "DELIVERY_WINDOW") {
        assignedCount = await prisma.deliveryTrip.count({
          where: { deliveryWindow: masterItem.name },
        });
        targetEntity = "delivery trip(s)";
      } else if (masterItem.category.code === "PLANNING_TYPE") {
        assignedCount = await prisma.deliveryTrip.count({
          where: { planningType: masterItem.name },
        });
        targetEntity = "delivery trip(s)";
      } else if (masterItem.category.code === "REQUESTED_BY") {
        assignedCount = await prisma.deliveryTrip.count({
          where: { requestedByDept: masterItem.name },
        });
        targetEntity = "delivery trip(s)";
      } else if (masterItem.category.code === "SUB_OPERATION") {
        assignedCount = await prisma.vehicleRequest.count({
          where: { subOperationId: itemId },
        });
        targetEntity = "transport request(s)";
      } else if (masterItem.category.code === "VEHICLE_TYPE") {
        assignedCount = await prisma.vehicle.count({
          where: {
            OR: [
              { vehicleType: masterItem.code },
              { vehicleType: masterItem.name },
            ],
          },
        });
        targetEntity = "fleet vehicle(s)";
      } else if (masterItem.category.code === "VEHICLE_CATEGORY") {
        assignedCount = await prisma.vehicle.count({
          where: {
            OR: [
              { vehicleCategory: masterItem.code },
              { vehicleCategory: masterItem.name },
            ],
          },
        });
        targetEntity = "fleet vehicle(s)";
      }

      if (assignedCount > 0) {
        return NextResponse.json({
          status: "warning",
          requiresConfirmation: true,
          assignedCount,
          targetEntity,
          message: `Warning: "${masterItem.name}" is currently assigned to ${assignedCount} ${targetEntity}. Deleting it will affect existing records. Are you sure you want to proceed?`,
        });
      }
    }

    await prisma.masterData.update({
      where: { id: parseInt(id, 10) },
      data: { active: 0 },
    });

    return NextResponse.json({ status: "success", message: "Item removed" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

