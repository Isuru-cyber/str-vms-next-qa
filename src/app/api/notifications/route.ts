import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const session = auth.user;

    const where = {
      OR: [
        { userId: session.id },
        { roleTarget: session.roleCode },
        { roleTarget: "ALL" },
      ],
    };

    const [notifications, unreadCount] = await Promise.all([
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

    const userScope = {
      OR: [
        { userId: session.id },
        { roleTarget: session.roleCode },
        { roleTarget: "ALL" },
      ],
    };

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          ...userScope,
          isRead: 0,
        },
        data: {
          isRead: 1,
        },
      });

      return NextResponse.json({ status: "success", message: "All notifications marked as read." });
    }

    if (id) {
      await prisma.notification.updateMany({
        where: {
          id: parseInt(id, 10),
          ...userScope,
        },
        data: { isRead: 1 },
      });

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

    // Clear personal read notifications to protect shared role-targeted notifications
    await prisma.notification.deleteMany({
      where: {
        isRead: 1,
        userId: session.id,
      },
    });

    return NextResponse.json({ status: "success", message: "Cleared personal read notifications." });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to clear notifications" }, { status: 500 });
  }
}
