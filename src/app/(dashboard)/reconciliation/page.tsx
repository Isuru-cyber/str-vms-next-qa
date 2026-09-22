import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ReconciliationHubClient } from "@/components/reconciliation/ReconciliationHubClient";

export default async function ReconciliationPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  let trips: any[] = [];
  try {
    const where: any = {
      OR: [
        {
          status: {
            in: ["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED", "ASSIGNED", "STARTED", "DISPATCHED", "READY_FOR_LOADING"],
          },
        },
        {
          reconciliations: {
            some: {},
          },
        },
        {
          gatePasses: {
            some: {},
          },
        },
      ],
    };

    if (!isAdmin(user) && user.plantIds && user.plantIds.length > 0) {
      where.tripRequests = {
        some: {
          request: {
            plantId: { in: user.plantIds },
          },
        },
      };
    }

    const rawTrips = await prisma.deliveryTrip.findMany({
      where,
      include: {
        vehicle: true,
        driver: true,
        gatePasses: {
          orderBy: { id: "asc" },
        },
        reconciliations: {
          orderBy: { id: "desc" },
        },
        tripRequests: {
          include: {
            request: true,
          },
        },
      },
      orderBy: { id: "desc" },
    });

    trips = rawTrips.map((t: any) => {
      const plannedBoxes = t.tripRequests.reduce(
        (sum: number, tr: any) => sum + (Number(tr.request?.boxCount) || 0),
        0
      );
      const plannedWeightKg = t.tripRequests.reduce(
        (sum: number, tr: any) => sum + (Number(tr.request?.requiredKg) || 0),
        0
      );
      const latestRec = t.reconciliations?.[0] || null;

      // Extract unique invoice numbers across all requests in this trip
      const invoiceSet = new Set<string>();
      for (const tr of t.tripRequests) {
        if (tr.request?.invoiceNumbers) {
          const tokens = tr.request.invoiceNumbers
            .split(/[\r\n,;]+/)
            .map((s: string) => s.trim())
            .filter(Boolean);
          for (const tok of tokens) {
            invoiceSet.add(tok);
          }
        }
      }

      const invoices = Array.from(invoiceSet).map((invNo) => {
        const isReconciled =
          ["RECONCILED", "FINALIZED", "CLOSED"].includes(t.status) ||
          t.reconciliations.some(
            (r: any) =>
              r.invoiceNumbers?.toUpperCase().includes(invNo.toUpperCase()) ||
              r.gatePassNo?.toUpperCase() === invNo.toUpperCase()
          );
        return {
          invoiceNo: invNo,
          status: isReconciled ? "RECONCILED" : "PENDING",
        };
      });

      return {
        id: t.id,
        tripNo: t.tripNo,
        status: t.status,
        vehicleNumber: t.vehicle?.vehicleNumber || "-",
        vehicleType: t.vehicle?.vehicleType || "-",
        driverName: t.driver?.name || "-",
        plannedKm: Number(t.plannedKm || 0),
        requestCount: t.tripRequests.length,
        plannedBoxes,
        plannedWeightKg,
        invoices,
        gatePasses: t.gatePasses.map((gp: any) => ({
          id: gp.id,
          gatePassNo: gp.gatePassNo,
          status: gp.status || "ENTERED",
          remarks: gp.remarks,
        })),
        latestReconciliation: latestRec
          ? {
              matchStatus: latestRec.matchStatus,
              actualVehicleNo: latestRec.actualVehicleNo,
              actualBoxes: latestRec.actualBoxes,
              actualKg: Number(latestRec.actualKg || 0),
              actualCbm: Number(latestRec.actualCbm || 0),
              varianceRemarks: latestRec.varianceRemarks,
            }
          : null,
      };
    });
  } catch (err) {
    console.error("Failed to load reconciliation trips:", err);
  }

  return <ReconciliationHubClient initialTrips={trips} />;
}
