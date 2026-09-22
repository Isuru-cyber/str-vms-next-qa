import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi();
    if (auth.error) return auth.error;
    const session = auth.user;

    await prisma.user.update({
      where: { id: session.id },
      data: { mustChangePassword: 0 },
    });

    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "DISMISS_PASSWORD_CHANGE",
          module: "SECURITY",
          details: `User ${session.email} skipped the first-time password change prompt. Kept initial password.`,
        },
      });
    } catch {
      // ignore logging error
    }

    return NextResponse.json({
      status: "success",
      message: "Password change prompt dismissed successfully.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to dismiss password prompt" },
      { status: 500 }
    );
  }
}
