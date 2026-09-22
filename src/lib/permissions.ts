export * from "./permission-utils";
import { SessionUser, getSession } from "./auth";
import { NextResponse } from "next/server";
import { can, isSuperAdmin, isAdmin } from "./permission-utils";

/**
 * Shared API authorization helper for Next.js route handlers (S-2)
 */
export async function authorizeApi(
  options?: {
    action?: string;
    adminOnly?: boolean;
    superAdminOnly?: boolean;
  }
): Promise<{ user: SessionUser; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getSession();
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in to continue." },
        { status: 401 }
      ),
    };
  }

  if (options?.superAdminOnly && !isSuperAdmin(user)) {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: Super Administrator access required." },
        { status: 403 }
      ),
    };
  }

  if (options?.adminOnly && !isAdmin(user)) {
    return {
      error: NextResponse.json(
        { success: false, message: "Forbidden: Administrator access required." },
        { status: 403 }
      ),
    };
  }

  if (options?.action && !can(user, options.action)) {
    return {
      error: NextResponse.json(
        {
          success: false,
          message: `Forbidden: You do not have permission to '${options.action}'.`,
        },
        { status: 403 }
      ),
    };
  }

  return { user };
}
