import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const session = auth.user;

    const baseWhere = {
      OR: [
        { userId: session.id, roleTarget: { not: "USER_READ_RECEIPT" } },
        { userId: null, roleTarget: session.roleCode },
        { userId: null, roleTarget: "ALL" },
      ],
    };

    const [rawNotifications, readReceipts] = await Promise.all([
      prisma.notification.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.findMany({
        where: {
          userId: session.id,
          roleTarget: "USER_READ_RECEIPT",
        },
        select: { title: true },
      }),
    ]);

    const readSharedIds = new Set(readReceipts.map((r) => Number(r.title)).filter((n) => !isNaN(n)));

    // Map isRead dynamically based on user ownership or personal read receipt
    const notifications = rawNotifications.map((n) => {
      const isShared = n.userId === null;
      const isReadForUser = isShared ? readSharedIds.has(n.id) || n.isRead === 1 : n.isRead === 1;
      return {
        ...n,
        isRead: isReadForUser ? 1 : 0,
      };
    });

    const unreadCount = notifications.filter((n) => n.isRead === 0).length;

    return NextResponse.json({
      status: "success",
      unreadCount,
      notifications,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to fetch notifications" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const session = auth.user;

    const body = await request.json();
    const { id, markAll } = body;

    if (markAll) {
      // 1. Mark all personal notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: session.id,
          roleTarget: { not: "USER_READ_RECEIPT" },
          isRead: 0,
        },
        data: { isRead: 1 },
      });

      // 2. Fetch all unread shared notifications for this role
      const unreadShared = await prisma.notification.findMany({
        where: {
          userId: null,
          isRead: 0,
          OR: [{ roleTarget: session.roleCode }, { roleTarget: "ALL" }],
        },
        select: { id: true, type: true },
      });

      // Fetch existing receipts to prevent duplicates
      const existingReceipts = await prisma.notification.findMany({
        where: {
          userId: session.id,
          roleTarget: "USER_READ_RECEIPT",
        },
        select: { title: true },
      });
      const existingReceiptIds = new Set(existingReceipts.map((r) => r.title));

      const newReceipts = unreadShared
        .filter((n) => !existingReceiptIds.has(String(n.id)))
        .map((n) => ({
          userId: session.id,
          roleTarget: "USER_READ_RECEIPT",
          title: String(n.id),
          message: "READ",
          type: n.type || "INFO",
          isRead: 1,
        }));

      if (newReceipts.length > 0) {
        await prisma.notification.createMany({
          data: newReceipts,
        });
      }

      return NextResponse.json({ status: "success", message: "All notifications marked as read." });
    }

    if (id) {
      const notifId = parseInt(id, 10);
      if (isNaN(notifId)) {
        return NextResponse.json({ message: "Invalid notification ID" }, { status: 400 });
      }

      const notif = await prisma.notification.findUnique({
        where: { id: notifId },
      });

      if (!notif) {
        return NextResponse.json({ message: "Notification not found" }, { status: 404 });
      }

      if (notif.userId === session.id) {
        // Direct personal notification: update row directly
        await prisma.notification.update({
          where: { id: notifId },
          data: { isRead: 1 },
        });
      } else if (notif.userId === null && (notif.roleTarget === session.roleCode || notif.roleTarget === "ALL")) {
        // Shared role-targeted notification: create per-user read receipt without affecting other users
        const existingReceipt = await prisma.notification.findFirst({
          where: {
            userId: session.id,
            roleTarget: "USER_READ_RECEIPT",
            title: String(notifId),
          },
        });

        if (!existingReceipt) {
          await prisma.notification.create({
            data: {
              userId: session.id,
              roleTarget: "USER_READ_RECEIPT",
              title: String(notifId),
              message: "READ",
              type: notif.type || "INFO",
              isRead: 1,
            },
          });
        }
      }

      return NextResponse.json({ status: "success", message: "Notification marked as read." });
    }

    return NextResponse.json({ message: "Invalid request payload" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const session = auth.user;

    // Clear personal read notifications and read receipts
    await prisma.notification.deleteMany({
      where: {
        userId: session.id,
        isRead: 1,
      },
    });

    return NextResponse.json({ status: "success", message: "Cleared personal read notifications." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to clear notifications" }, { status: 500 });
  }
}
