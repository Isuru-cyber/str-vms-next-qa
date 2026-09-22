import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestsRegistryClient } from "@/components/requests/RequestsRegistryClient";

export default async function RequestsPage() {
  const user = await getSession();

  const whereClause: any = {};
  if (user && user.roleCode === "ENTRY_USER") {
    whereClause.plantId = { in: user.plantIds && user.plantIds.length > 0 ? user.plantIds : [-1] };
  }

  const [requests, plants, operations] = await Promise.all([
    prisma.vehicleRequest.findMany({
      where: whereClause,
      take: 500,
      orderBy: [{ requiredDate: "desc" }, { id: "desc" }],
      include: {
        plant: true,
        operation: true,
        subOperation: true,
        fromLocation: true,
        toLocation: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            userCode: true,
          },
        },
        tripRequests: {
          include: {
            trip: {
              include: {
                vehicle: true,
                driver: true,
                route: true,
              },
            },
          },
        },
      },
    }),
    prisma.plant.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.operation.findMany({ orderBy: { name: "asc" } }),
  ]);

  const serializedRequests = JSON.parse(JSON.stringify(requests));

  return (
    <div className="w-full">
      <RequestsRegistryClient
        initialRequests={serializedRequests}
        plants={plants}
        operations={operations}
        currentUser={user}
      />
    </div>
  );
}
