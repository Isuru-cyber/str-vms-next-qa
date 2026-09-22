import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get("active") === "true";

    const where: any = {};
    if (onlyActive) {
      where.active = 1;
    }

    const plants = await prisma.plant.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ status: "success", data: plants });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to fetch plants" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ superAdminOnly: true, action: "edit_master_data" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { code, name, businessGroup, sortOrder, active } = body;

    if (!code || !name) {
      return NextResponse.json({ message: "Plant code and name are required." }, { status: 400 });
    }

    const cleanCode = String(code).trim().toUpperCase();
    const cleanName = String(name).trim();

    // Check duplicate code
    const existing = await prisma.plant.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      return NextResponse.json({ message: `Plant with code '${cleanCode}' already exists.` }, { status: 400 });
    }

    // Determine sort order if not provided
    let order = 10;
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== "") {
      order = parseInt(String(sortOrder), 10);
    } else {
      const maxPlant = await prisma.plant.findFirst({
        orderBy: { sortOrder: "desc" },
      });
      order = (maxPlant?.sortOrder || 0) + 1;
    }

    const plant = await prisma.plant.create({
      data: {
        code: cleanCode,
        name: cleanName,
        businessGroup: businessGroup ? String(businessGroup).trim().toUpperCase() : "ELASTIC",
        sortOrder: order,
        active: active !== undefined ? (active ? 1 : 0) : 1,
      },
    });

    // Auto-create a corresponding origin location for this plant if not existing
    try {
      await prisma.location.create({
        data: {
          locationName: `${cleanCode} - PLANT`,
          businessGroup: plant.businessGroup || "ELASTIC",
          code: cleanCode,
          locationType: "PLANT",
          plantId: plant.id,
          isOrigin: 1,
          active: 1,
        },
      });
    } catch (locErr) {
      console.warn("Could not auto-create origin location for plant:", locErr);
    }

    return NextResponse.json({ status: "success", data: plant });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to create plant" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ superAdminOnly: true, action: "edit_master_data" });
    if (auth.error) return auth.error;

    const body = await request.json();
    const { id, code, name, businessGroup, sortOrder, active } = body;

    const plantId = parseInt(String(id), 10);
    if (isNaN(plantId)) {
      return NextResponse.json({ message: "Invalid plant ID" }, { status: 400 });
    }

    const updateData: any = {};
    if (code) updateData.code = String(code).trim().toUpperCase();
    if (name) updateData.name = String(name).trim();
    if (businessGroup) updateData.businessGroup = String(businessGroup).trim().toUpperCase();
    if (sortOrder !== undefined && sortOrder !== null && sortOrder !== "") {
      updateData.sortOrder = parseInt(String(sortOrder), 10);
    }
    if (active !== undefined) {
      updateData.active = active ? 1 : 0;
    }

    const updated = await prisma.plant.update({
      where: { id: plantId },
      data: updateData,
    });

    return NextResponse.json({ status: "success", data: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to update plant" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authorizeApi({ superAdminOnly: true, action: "edit_master_data" });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "ID required" }, { status: 400 });

    const plantId = parseInt(id, 10);
    if (isNaN(plantId)) return NextResponse.json({ message: "Invalid plant ID" }, { status: 400 });

    // Soft-deactivate plant to protect historical integrity
    const updated = await prisma.plant.update({
      where: { id: plantId },
      data: { active: 0 },
    });

    return NextResponse.json({ status: "success", message: "Plant deactivated successfully", data: updated });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to deactivate plant" }, { status: 500 });
  }
}
