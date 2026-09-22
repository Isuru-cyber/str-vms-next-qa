import { prisma } from "./prisma";

export class ActivityLogger {
  public static async log(
    module: string,
    action: string,
    recordId?: string | number | null,
    details?: string | null,
    userId?: number | null,
    ipAddress: string = "127.0.0.1"
  ) {
    try {
      if (!userId) {
        // Find superadmin or system user ID 1
        const fallback = await prisma.user.findFirst({ select: { id: true } });
        userId = fallback?.id ?? 1;
      }
      const finalUserId = userId ?? 1;

      await prisma.activityLog.create({
        data: {
          userId: finalUserId,
          module: module || "SYSTEM",
          action,
          recordId: recordId ? String(recordId) : null,
          details: details || null,
          ipAddress,
        },
      });
    } catch (e) {
      console.error("ActivityLogger error:", e);
    }
  }
}
