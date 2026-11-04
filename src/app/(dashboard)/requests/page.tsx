import React from "react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin, can } from "@/lib/permission-utils";
import { RequestsRegistryClient } from "@/components/requests/RequestsRegistryClient";

export default async function RequestsPage() {
  const user = await getSession();

  const isManagement = isAdmin(user) || can(user, "allocate_trips") || can(user, "dispatch_trips");

  const whereClause: any = {};
  if (!isManagement) {
    // User-level requesters only see their own requests!
    whereClause.requesterId = user ? user.id : -1;
  } else if (!isAdmin(user) && user?.plantIds?.length) {
    // Non-admin management users (e.g. plant dispatchers) see requests for their assigned plants
    whereClause.plantId = { in: user.plantIds };
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
