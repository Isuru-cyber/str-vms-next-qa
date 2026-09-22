import React from "react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { NotificationsHub } from "@/components/notifications/NotificationsHub";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getSession();

  let notifications: any[] = [];
  let unreadCount = 0;

  if (user) {
    try {
      const where = {
        OR: [
          { userId: user.id },
          { roleTarget: user.roleCode },
          { roleTarget: "ALL" },
        ],
      };

      const [dbNotifications, count] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.notification.count({
          where: {
            ...where,
            isRead: 0,
          },
        }),
      ]);

      notifications = JSON.parse(JSON.stringify(dbNotifications));
      unreadCount = count;
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  }

  return (
    <NotificationsHub
      initialNotifications={notifications}
      initialUnreadCount={unreadCount}
    />
  );
}
