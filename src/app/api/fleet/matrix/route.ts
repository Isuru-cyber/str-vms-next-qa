import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permission-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!can(user, "view_fleet")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month"); // e.g. "2026-08"

    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
        year = y;
        month = m;
      }
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(year, month, 0).getDate();

    // Plant filter for non-admin
    const plantWhere = !isAdmin(user) && user.plantIds?.length
      ? {
          OR: [
            { defaultLocation: { plantId: { in: user.plantIds } } },
            { drivers: { some: { linkedPlantId: { in: user.plantIds } } } },
          ],
        }
      : {};

    const [vehicles, trips, dailyLogs] = await Promise.all([
      prisma.vehicle.findMany({
        where: {
          active: 1,
          ...plantWhere,
        },
        include: {
          defaultLocation: true,
          drivers: { take: 1 },
          operationCategory: true,
        },
        orderBy: { vehicleNumber: "asc" },
      }),
      prisma.deliveryTrip.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: "CANCELLED" },
        },
        select: {
          id: true,
          tripNo: true,
          vehicleId: true,
          status: true,
          plannedKm: true,
          actualKm: true,
          varianceKm: true,
          createdAt: true,
        },
      }),
      prisma.vehicleDailyLog.findMany({
        where: {
          logDate: { gte: startDate, lte: endDate },
        },
      }),
    ]);

    // Build vehicle daily matrix
    const matrix = vehicles.map((v) => {
      const vTrips = trips.filter((t) => t.vehicleId === v.id);
      const vLogs = dailyLogs.filter((l) => l.vehicleId === v.id);

      const days: Record<number, any> = {};
      let totalActualKm = 0;
      let totalPlannedKm = 0;
      let workingDays = 0;
      let heldupDays = 0;
      let didNotReportDays = 0;
      let absentDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        // Find trips on this day
        const dayTrips = vTrips.filter((t) => {
          const d = new Date(t.createdAt);
          return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day;
        });

        // Find daily log on this day
        const dayLog = vLogs.find((l) => {
          const d = new Date(l.logDate);
          return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day;
        });

        const dayPlannedKm = dayTrips.reduce((sum, t) => sum + (Number(t.plannedKm) || 0), 0);
        const hasActual = dayTrips.some((t) => Number(t.actualKm) > 0);
        const dayActualKm = hasActual
          ? dayTrips.reduce((sum, t) => sum + (Number(t.actualKm) || 0), 0)
          : null;
        const dayVariance = dayActualKm !== null ? Number((dayActualKm - dayPlannedKm).toFixed(1)) : null;

        // Determine status
        let status = "OFF";
        if (dayLog) {
          status = dayLog.status;
        } else if (dayTrips.length > 0) {
          status = "WORKING";
        }

        // Tally statistics
        if (status === "WORKING") workingDays++;
        else if (status === "NIGHT_PARK_HELDUP") heldupDays++;
        else if (status === "DID_NOT_REPORT") didNotReportDays++;
        else if (status === "ABSENT") absentDays++;

        if (dayActualKm !== null) totalActualKm += dayActualKm;
        totalPlannedKm += dayPlannedKm;

        days[day] = {
          day,
          dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
          status,
          remarks: dayLog?.remarks || null,
          plannedKm: dayPlannedKm > 0 ? Number(dayPlannedKm.toFixed(1)) : null,
          actualKm: dayActualKm !== null ? Number(dayActualKm.toFixed(1)) : null,
          varianceKm: dayVariance,
          tripCount: dayTrips.length,
          trips: dayTrips.map((t) => ({
            id: t.id,
            tripNo: t.tripNo,
            status: t.status,
            plannedKm: t.plannedKm,
            actualKm: t.actualKm,
          })),
        };
      }

      const totalVariance = Number((totalActualKm - totalPlannedKm).toFixed(1));

      return {
        id: v.id,
        vehicleNumber: v.vehicleNumber,
        vehicleType: v.vehicleType,
        driverName: v.drivers?.[0]?.name || "Unassigned",
        driverMobile: v.drivers?.[0]?.mobile || "-",
        homePlant: v.defaultLocation?.locationName || "Central Fleet",
        paymentBasis: v.paymentBasis || "KM_BASED",
        monthlyFixedRate: Number(v.monthlyFixedRate || 0),
        monthlyKmLimit: Number(v.monthlyKmLimit || 0),
        extraKmRate: Number(v.extraKmRate || 0),
        fuelConsumptionKml: Number(v.fuelConsumptionKml || 10),
        runningCostPerKm: Number(v.runningCostPerKm || 20.5),
        profitPerKm: Number(v.profitPerKm || 15),
        days,
        summary: {
          totalActualKm: Number(totalActualKm.toFixed(1)),
          totalPlannedKm: Number(totalPlannedKm.toFixed(1)),
          totalVarianceKm: totalVariance,
          workingDays,
          heldupDays,
          didNotReportDays,
          absentDays,
          remarks: v.remarks || null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      year,
      month,
      daysInMonth,
      monthStr: `${year}-${String(month).padStart(2, "0")}`,
      vehicles: matrix,
    });
  } catch (err: any) {
    console.error("Error generating fleet matrix:", err);
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!can(user, "manage_fleet") && !isAdmin(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { vehicleId, date, status, remarks, forceOverride } = body;

    if (!vehicleId || !date || !status) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const logDate = new Date(date);
    if (isNaN(logDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid date format" }, { status: 400 });
    }

    // Check for conflict: if trips exist on that day and status is DID_NOT_REPORT or ABSENT
    if (["DID_NOT_REPORT", "ABSENT"].includes(status) && !forceOverride) {
      const dayStart = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate(), 23, 59, 59, 999);

      const existingTrips = await prisma.deliveryTrip.findMany({
        where: {
          vehicleId: Number(vehicleId),
          createdAt: { gte: dayStart, lte: dayEnd },
          status: { not: "CANCELLED" },
        },
        select: { id: true, tripNo: true, status: true },
      });

      if (existingTrips.length > 0) {
        return NextResponse.json({
          success: false,
          conflict: true,
          message: `Vehicle already has ${existingTrips.length} active/completed trip(s) on this date (${existingTrips.map(t => t.tripNo).join(", ")}). Marking it as '${status}' will flag a contradiction with operations.`,
          trips: existingTrips,
        });
      }
    }

    // Upsert into vehicle_daily_logs
    const updatedLog = await prisma.vehicleDailyLog.upsert({
      where: {
        vehicleId_logDate: {
          vehicleId: Number(vehicleId),
          logDate,
        },
      },
      update: {
        status,
        remarks: remarks || null,
        createdById: user.id,
      },
      create: {
        vehicleId: Number(vehicleId),
        logDate,
        status,
        remarks: remarks || null,
        createdById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Daily status updated successfully.",
      log: updatedLog,
    });
  } catch (err: any) {
    console.error("Error saving daily vehicle log:", err);
    return NextResponse.json({ success: false, message: err.message || "Internal server error" }, { status: 500 });
  }
}
