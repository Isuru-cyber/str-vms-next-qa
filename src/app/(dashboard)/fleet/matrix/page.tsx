import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { can, isAdmin } from "@/lib/permission-utils";
import { FleetRunningMatrix } from "@/components/fleet/FleetRunningMatrix";

export const dynamic = "force-dynamic";

export default async function FleetMatrixPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  if (!can(user, "view_fleet")) {
    redirect("/");
  }

  const { month: monthParam } = await searchParams;

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

  const plantWhere = !isAdmin(user) && user.plantIds?.length
    ? {
        OR: [
          { defaultLocation: { plantId: { in: user.plantIds } } },
          { drivers: { some: { linkedPlantId: { in: user.plantIds } } } },
        ],
      }
    : {};

  let matrixData: any[] = [];

  try {
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

    matrixData = vehicles.map((v) => {
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
        const dayTrips = vTrips.filter((t) => {
          const d = new Date(t.createdAt);
          return d.getFullYear() === year && d.getMonth() + 1 === month && d.getDate() === day;
        });

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

        let status = "OFF";
        if (dayLog) {
          status = dayLog.status;
        } else if (dayTrips.length > 0) {
          status = "WORKING";
        }

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
          totalVarianceKm: Number((totalActualKm - totalPlannedKm).toFixed(1)),
          workingDays,
          heldupDays,
          didNotReportDays,
          absentDays,
          remarks: v.remarks || null,
        },
      };
    });
  } catch (err) {
    console.error("Error loading matrix page:", err);
  }

  const initialData = {
    year,
    month,
    daysInMonth,
    monthStr: `${year}-${String(month).padStart(2, "0")}`,
    vehicles: matrixData,
  };

  return <FleetRunningMatrix initialData={initialData} />;
}
