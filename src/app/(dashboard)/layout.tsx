import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  let unreadCount = 0;
  try {
    unreadCount = await prisma.notification.count({
      where: {
        isRead: 0,
        OR: [
          { userId: user.id },
          { roleTarget: user.roleCode },
        ],
      },
    });
  } catch {
    unreadCount = 0;
  }

  return (
    <AppShell user={user} unreadNotifications={unreadCount}>
      {children}
    </AppShell>
  );
}
