import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { PodManagerClient, PodInvoiceItem } from "@/components/pod/PodManagerClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "POD Management | STR Logistics VMS",
  description: "Record customer-signed commercial invoices returned by drivers",
};

export default async function PodManagementPage() {
  const user = await getSession();
  if (!user) {
    redirect("/login");
  }

  let invoiceList: PodInvoiceItem[] = [];

  try {
    const where: any = {
      status: { in: ["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"] },
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

    const trips = await prisma.deliveryTrip.findMany({
      where,
      take: 250,
      orderBy: { id: "desc" },
      include: {
        vehicle: true,
        driver: true,
        tripRequests: {
          include: {
            request: {
              include: {
                plant: true,
                toLocation: true,
              },
            },
          },
        },
        pods: true,
      },
    });

    for (const trip of trips) {
      const tripPodsMap = new Map<string, any>();
      (trip.pods || []).forEach((p: any) => {
        tripPodsMap.set(p.invoiceNumber.trim().toUpperCase(), p);
      });

      for (const tr of trip.tripRequests) {
        const req = tr.request;
        if (!req || !req.invoiceNumbers) continue;

        const rawInvoices = req.invoiceNumbers
          .split(/[\r\n,]+/)
          .map((s: string) => s.trim())
          .filter(Boolean);

        for (const rawInv of rawInvoices) {
          const invUpper = rawInv.toUpperCase();
          const existingPod = tripPodsMap.get(invUpper);

          invoiceList.push({
            id: existingPod ? existingPod.id : `pod_${trip.id}_${invUpper}`,
            dbId: existingPod?.id || null,
            tripId: trip.id,
            tripNo: trip.tripNo,
            tripStatus: trip.status,
            requestId: req.id,
            requestCode: req.requestCode,
            invoiceNumber: rawInv,
            vehicleNumber: trip.vehicle?.vehicleNumber || "Unassigned",
            vehicleType: trip.vehicle?.vehicleType || "Fleet Vehicle",
            driverName: trip.driver?.name || "Unassigned",
            driverMobile: trip.driver?.mobile || "-",
            locationName: req.toLocation?.locationName || "Factory Customer Bay",
            plantCode: req.plant?.code || "STR",
            dispatchedDate: trip.createdAt.toISOString().slice(0, 10),
            isReceived: existingPod ? existingPod.isReceived : false,
            receivedAt: existingPod?.receivedAt ? existingPod.receivedAt.toISOString() : null,
            receivedByName: existingPod?.receivedByName || null,
            remarks: existingPod?.remarks || "",
          });
        }
      }
    }
  } catch (error) {
    console.error("Error loading POD data in page:", error);
  }

  const totalInvoices = invoiceList.length;
  const receivedCount = invoiceList.filter((i) => i.isReceived).length;
  const pendingCount = totalInvoices - receivedCount;
  const returnRate = totalInvoices > 0 ? Math.round((receivedCount / totalInvoices) * 100) : 100;

  return (
    <PodManagerClient
      initialInvoices={invoiceList}
      initialStats={{
        totalInvoices,
        receivedCount,
        pendingCount,
        returnRate,
      }}
    />
  );
}
