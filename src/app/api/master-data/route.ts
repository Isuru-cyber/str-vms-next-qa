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
        code,
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
        code,
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
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    await prisma.masterData.update({
      where: { id: parseInt(id, 10) },
      data: { active: 0 },
    });

    return NextResponse.json({ status: "success", message: "Item removed" });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

