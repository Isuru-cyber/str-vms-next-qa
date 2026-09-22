import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";

export async function GET() {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;

    const rates = await prisma.monthlyFuelRate.findMany({
      orderBy: { periodMonth: "desc" },
    });

    return NextResponse.json({
      success: true,
      rates: rates.map((r: any) => ({
        ...r,
        dieselRate: Number(r.dieselRate),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // S-7: Fuel Rates management is strictly Super Admin exclusive in PHP VMS
    const auth = await authorizeApi({ superAdminOnly: true, action: "manage_fuel_rates" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { periodMonth, dieselRate, notes } = body;

    if (!periodMonth || !/^\d{4}-\d{2}$/.test(periodMonth)) {
      return NextResponse.json(
        { success: false, message: "Invalid period month. Format must be YYYY-MM." },
        { status: 400 }
      );
    }

    const rateNum = parseFloat(dieselRate);
    if (isNaN(rateNum) || rateNum <= 0) {
      return NextResponse.json(
        { success: false, message: "Diesel rate must be a positive number." },
        { status: 400 }
      );
    }

    // Check if period exists and is locked
    const existing = await prisma.monthlyFuelRate.findUnique({
      where: { periodMonth },
    });

    if (existing && existing.isLocked === 1) {
      return NextResponse.json(
        { success: false, message: `Period ${periodMonth} is locked and cannot be edited.` },
        { status: 400 }
      );
    }

    const rate = await prisma.monthlyFuelRate.upsert({
      where: { periodMonth },
      create: {
        periodMonth,
        dieselRate: rateNum,
        notes: notes || null,
        isLocked: 0,
      },
      update: {
        dieselRate: rateNum,
        notes: notes || null,
      },
    });

    await ActivityLogger.log(
      "MASTER_DATA",
      "SAVE_FUEL_RATE",
      periodMonth,
      `Updated Diesel Rate for ${periodMonth} to LKR ${rateNum}/L`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Fuel rate for ${periodMonth} saved successfully.`,
      rate: {
        ...rate,
        dieselRate: Number(rate.dieselRate),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await authorizeApi({ superAdminOnly: true, action: "manage_fuel_rates" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Rate ID is required." }, { status: 400 });
    }

    const existing = await prisma.monthlyFuelRate.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Fuel rate record not found." }, { status: 404 });
    }

    const newLockState = existing.isLocked === 1 ? 0 : 1;
    const updated = await prisma.monthlyFuelRate.update({
      where: { id: Number(id) },
      data: { isLocked: newLockState },
    });

    const statusText = newLockState === 1 ? "LOCKED" : "UNLOCKED";
    await ActivityLogger.log(
      "MASTER_DATA",
      "LOCK_FUEL_RATE",
      existing.periodMonth,
      `Changed lock status to ${statusText} for fuel rate ${existing.periodMonth}`,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: `Fuel rate for ${existing.periodMonth} is now ${statusText.toLowerCase()}.`,
      rate: {
        ...updated,
        dieselRate: Number(updated.dieselRate),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message }, { status: 500 });
  }
}
