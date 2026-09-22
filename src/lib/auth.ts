import { cache } from "react";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { getRoleDefaultPermissions } from "./permission-utils";

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable is missing in production! System halting."
      );
    }
    console.warn(
      "[SECURITY WARNING] JWT_SECRET environment variable is unset. Using local development fallback."
    );
    return new TextEncoder().encode("str-vms-local-dev-fallback-key-strictly-non-prod-2026");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: number;
  userCode: string | null;
  name: string;
  email: string;
  roleId: number;
  roleCode: string;
  plantIds: number[];
  subOpIds: number[];
  permissions: string[];
  hasCustomPermissions?: boolean;
  themePreference: string;
  mustChangePassword?: boolean;
}

export async function createSessionToken(payload: SessionUser): Promise<string> {
  const secretKey = getJwtSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const secretKey = getJwtSecretKey();
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export const getSession = cache(async (options?: { skipDbSync?: boolean }): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("str_vms_session")?.value;
  if (!token) return null;
  const decoded = await verifySessionToken(token);
  if (!decoded) return null;

  if (options?.skipDbSync) {
    return decoded;
  }

  try {
    const liveUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: true,
        plants: true,
        subOperations: true,
        permissions: true,
      },
    });

    if (!liveUser || liveUser.active === 0) {
      return null;
    }

    const hasCustom = liveUser.sidebarHiddenItems === "CUSTOM" || liveUser.permissions.length > 0;
    const permissions = hasCustom
      ? liveUser.permissions.map((p: { permissionKey: string }) => p.permissionKey)
      : getRoleDefaultPermissions(liveUser.role.code);

    return {
      id: liveUser.id,
      userCode: liveUser.userCode,
      name: liveUser.name,
      email: liveUser.email,
      roleId: liveUser.roleId,
      roleCode: liveUser.role.code,
      plantIds: liveUser.plants.map((p: { plantId: number }) => p.plantId),
      subOpIds: liveUser.subOperations.map((s: { subOperationId: number }) => s.subOperationId),
      permissions,
      hasCustomPermissions: hasCustom,
      themePreference: liveUser.themePreference || decoded.themePreference || "material",
      mustChangePassword: liveUser.mustChangePassword === 1,
    };
  } catch (err) {
    console.error("Database user sync fallback to token:", err);
    return decoded;
  }
});

export async function setSessionCookie(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set("str_vms_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("str_vms_session");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // PHP password_hash uses $2y$, bcryptjs supports $2a$
  const normalizedHash = hash.replace(/^\$2y\$/, "$2a$");
  return bcrypt.compare(password, normalizedHash);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
