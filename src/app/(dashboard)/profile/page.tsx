import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ProfileConsole } from "@/components/profile/ProfileConsole";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let userRecord: any = null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      include: {
        role: true,
        plants: {
          include: { plant: true },
        },
        operations: {
          include: { operation: true },
        },
        subOperations: {
          include: { subOperation: true },
        },
        permissions: true,
        activityLogs: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    });

    if (user) {
      const { password, ...safeUser } = user;
      userRecord = JSON.parse(JSON.stringify(safeUser));
    }
  } catch (error) {
    console.error("Error loading user profile:", error);
  }

  if (!userRecord) {
    return (
      <div className="p-8 text-center text-gray-500 text-xs">
        Failed to load user profile. Please log in again.
      </div>
    );
  }

  return <ProfileConsole user={userRecord} />;
}
