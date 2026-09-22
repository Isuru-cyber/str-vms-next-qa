import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, setSessionCookie, SessionUser } from "@/lib/auth";
import { getRoleDefaultPermissions } from "@/lib/permission-utils";
import { ActivityLogger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    // 1. Brute-Force Lockout Protection (S-5: 5 failed attempts in 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    let failedCount = 0;
    try {
      failedCount = await prisma.activityLog.count({
        where: {
          module: "AUTH",
          action: "FAILED_LOGIN",
          recordId: cleanEmail,
          createdAt: { gte: fifteenMinutesAgo },
        },
      });
    } catch (e) {
      console.error("Failed to query login lockout count:", e);
    }

    if (failedCount >= 5) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Too many failed login attempts. This account is temporarily locked for 15 minutes for security.",
        },
        { status: 429 }
      );
    }

    // 2. Strict Database Authentication (S-1: No backdoors, no demo fallbacks)
    const userRecord = await prisma.user.findFirst({
      where: { email: cleanEmail, active: 1 },
      include: {
        role: true,
        plants: true,
        subOperations: true,
        permissions: true,
      },
    });

    if (!userRecord) {
      // Record failed attempt to prevent email enumeration bypass
      await ActivityLogger.log(
        "AUTH",
        "FAILED_LOGIN",
        cleanEmail,
        `Failed login attempt for non-existent or inactive email from IP ${ip}`,
        null,
        ip
      );

      const errorMsg =
        failedCount >= 4
          ? "Invalid email or password. Account locked for 15 minutes."
          : "Invalid email or password.";

      return NextResponse.json({ success: false, message: errorMsg }, { status: 401 });
    }

    const match = await verifyPassword(password, userRecord.password);
    if (!match) {
      await ActivityLogger.log(
        "AUTH",
        "FAILED_LOGIN",
        cleanEmail,
        `Failed password attempt for user ${userRecord.name} (${cleanEmail}) from IP ${ip}`,
        userRecord.id,
        ip
      );

      const errorMsg =
        failedCount >= 4
          ? "Invalid email or password. Account locked for 15 minutes."
          : "Invalid email or password.";

      return NextResponse.json({ success: false, message: errorMsg }, { status: 401 });
    }

    // 3. Successful Login
    const hasCustom = userRecord.sidebarHiddenItems === "CUSTOM" || userRecord.permissions.length > 0;
    const permissions = hasCustom
      ? userRecord.permissions.map((p: { permissionKey: string }) => p.permissionKey)
      : getRoleDefaultPermissions(userRecord.role.code);

    const sessionUser: SessionUser = {
      id: userRecord.id,
      userCode: userRecord.userCode,
      name: userRecord.name,
      email: userRecord.email,
      roleId: userRecord.roleId,
      roleCode: userRecord.role.code,
      plantIds: userRecord.plants.map((p: { plantId: number }) => p.plantId),
      subOpIds: userRecord.subOperations.map((s: { subOperationId: number }) => s.subOperationId),
      permissions,
      hasCustomPermissions: hasCustom,
      themePreference: userRecord.themePreference || "material",
      mustChangePassword: userRecord.mustChangePassword === 1,
    };

    await setSessionCookie(sessionUser);
    await ActivityLogger.log(
      "AUTH",
      "LOGIN",
      userRecord.id,
      `User ${userRecord.name} (${userRecord.email}) signed in successfully`,
      userRecord.id,
      ip
    );

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          process.env.NODE_ENV === "production"
            ? "Authentication error. Please try again later."
            : err?.message || "Authentication error.",
      },
      { status: 500 }
    );
  }
}

