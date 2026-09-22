import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { authorizeApi } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const session = auth.user;

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword, isFirstLogin } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json({ message: "User account not found." }, { status: 404 });
    }

    // Verify current password strictly
    if (!currentPassword) {
      return NextResponse.json(
        { message: "Current password is required." },
        { status: 400 }
      );
    }
    const isMatch = await verifyPassword(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json(
        { message: "Current password is incorrect. Please try again." },
        { status: 400 }
      );
    }

    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        { message: "New password and confirmation password are required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { message: "New password and confirmation password do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[\W_]/.test(newPassword)) {
      return NextResponse.json(
        { message: "New password must be at least 8 characters long and contain letters, numbers, and special characters." },
        { status: 400 }
      );
    }

    if (currentPassword && newPassword === currentPassword) {
      return NextResponse.json(
        { message: "New password cannot be the same as your current password." },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(newPassword);

    await prisma.$transaction(async (tx: any) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashed,
          mustChangePassword: 0,
        },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "PASSWORD_CHANGED",
          module: "SECURITY",
          details: `Password changed successfully for user ${user.email}`,
        },
      });
    });

    return NextResponse.json({
      status: "success",
      message: "Password changed successfully. Your next login will require the new password.",
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to update password" }, { status: 500 });
  }
}
