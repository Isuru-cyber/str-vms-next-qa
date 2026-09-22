import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, getSession, setSessionCookie } from "@/lib/auth";
import { authorizeApi, canManageRole, SUPER_ADMIN_EXCLUSIVE_ACTIONS } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_users" });
    if (auth.error) return auth.error;
    const session = auth.user;

    const body = await request.json();
    const {
      name,
      email,
      password,
      roleId,
      plantIds = [],
      permissions = [],
      active = 1,
      mustChangePassword = 1,
    } = body;

    if (!name || !email || !password || !roleId) {
      return NextResponse.json(
        { message: "Name, email, password, and role are required." },
        { status: 400 }
      );
    }

    // Verify target role permissions (S-3: Prevents non-superadmins from minting SUPER_ADMIN/ADMIN)
    const targetRole = await prisma.role.findUnique({
      where: { id: parseInt(roleId, 10) },
    });

    if (!targetRole) {
      return NextResponse.json({ message: "Invalid role specified." }, { status: 400 });
    }

    if (!canManageRole(session, targetRole.code)) {
      return NextResponse.json(
        {
          message:
            "Forbidden: You do not have sufficient privileges to assign the '" +
            targetRole.name +
            "' role.",
        },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: "A user with this email address already exists." },
        { status: 400 }
      );
    }

    const count = await prisma.user.count();
    const userCode = `USR-${String(count + 1).padStart(4, "0")}`;
    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        userCode,
        name,
        email,
        password: hashedPassword,
        roleId: parseInt(roleId, 10),
        active: active ? 1 : 0,
        mustChangePassword: mustChangePassword ? 1 : 0,
        sidebarHiddenItems: Array.isArray(permissions) && permissions.length > 0 ? "CUSTOM" : null,
        plants: {
          create: plantIds.map((pid: number) => ({ plantId: pid })),
        },
      },
      include: {
        role: true,
        plants: { include: { plant: true } },
        permissions: true,
      },
    });

    if (Array.isArray(permissions) && permissions.length > 0) {
      const allowedPermissions = session.roleCode === "SUPER_ADMIN"
        ? permissions
        : permissions.filter((p: string) => !SUPER_ADMIN_EXCLUSIVE_ACTIONS.includes(p as any));

      await prisma.userPermission.createMany({
        data: allowedPermissions.map((key: string) => ({
          userId: newUser.id,
          permissionKey: key,
        })),
        skipDuplicates: true,
      });
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: session.id,
          action: "CREATE_USER",
          module: "USERS",
          recordId: newUser.id,
          newValue: JSON.stringify({ email, name, roleId }),
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: `Created user account: ${name} (${email})`,
          module: "USERS",
          recordId: String(newUser.id),
        },
      });
    } catch (e) {
      console.error("Audit log error on user create:", e);
    }

    const { password: _, ...safeUser } = newUser;

    return NextResponse.json({
      status: "success",
      message: "User created successfully",
      data: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_users" });
    if (auth.error) return auth.error;
    const session = auth.user;

    const body = await request.json();
    const { id, name, email, password, roleId, plantIds, permissions, active, mustChangePassword } = body;

    if (!id) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    const userId = parseInt(id, 10);
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if current user can manage target user's current role
    if (!canManageRole(session, existingUser.role.code)) {
      return NextResponse.json(
        { message: "Forbidden: You do not have permission to modify this user account." },
        { status: 403 }
      );
    }

    // If role is being changed, check if current user can assign the new role
    if (roleId && parseInt(roleId, 10) !== existingUser.roleId) {
      const newRole = await prisma.role.findUnique({
        where: { id: parseInt(roleId, 10) },
      });
      if (!newRole || !canManageRole(session, newRole.code)) {
        return NextResponse.json(
          { message: "Forbidden: You do not have permission to assign this new role." },
          { status: 403 }
        );
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (roleId) updateData.roleId = parseInt(roleId, 10);
    if (active !== undefined) updateData.active = active ? 1 : 0;
    if (password) {
      updateData.password = await hashPassword(password);
      updateData.mustChangePassword = 1;
    }
    if (mustChangePassword !== undefined) {
      updateData.mustChangePassword = mustChangePassword ? 1 : 0;
    }

    // Update plant links if specified
    if (Array.isArray(plantIds)) {
      await prisma.userPlant.deleteMany({ where: { userId } });
      updateData.plants = {
        create: plantIds.map((pid: number) => ({ plantId: pid })),
      };
    }

    // Update custom permissions if specified
    if (Array.isArray(permissions)) {
      const allowedPermissions = session.roleCode === "SUPER_ADMIN"
        ? permissions
        : permissions.filter((p: string) => !SUPER_ADMIN_EXCLUSIVE_ACTIONS.includes(p as any));

      await prisma.userPermission.deleteMany({ where: { userId } });
      if (allowedPermissions.length > 0) {
        await prisma.userPermission.createMany({
          data: allowedPermissions.map((key: string) => ({
            userId,
            permissionKey: key,
          })),
          skipDuplicates: true,
        });
      }
      updateData.sidebarHiddenItems = "CUSTOM";
    } else if (body.resetToDefault) {
      await prisma.userPermission.deleteMany({ where: { userId } });
      updateData.sidebarHiddenItems = null;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        role: true,
        plants: { include: { plant: true } },
        permissions: true,
      },
    });

    // If current logged-in user updated their own account, refresh session cookie
    if (userId === session.id) {
      try {
        const refreshed = await getSession();
        if (refreshed) {
          await setSessionCookie(refreshed);
        }
      } catch (err) {
        console.error("Failed to refresh session cookie for current user:", err);
      }
    }

    const { password: _, ...safeUpdated } = updated;

    return NextResponse.json({
      status: "success",
      message: "User updated successfully",
      data: safeUpdated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
