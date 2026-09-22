import { prisma } from "@/lib/prisma";

async function internalGenerateNextTripNo(tx: any): Promise<string> {
  // Acquire transaction-scoped advisory lock to serialize trip sequence generation
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(718291);");

  const latestTrip = await tx.deliveryTrip.findFirst({
    orderBy: { id: "desc" },
    select: { id: true, tripNo: true },
  });

  let maxNum = latestTrip?.id ?? 0;
  if (latestTrip?.tripNo) {
    const match = latestTrip.tripNo.match(/\d+/);
    if (match) {
      const parsed = parseInt(match[0], 10);
      if (parsed > maxNum) maxNum = parsed;
    }
  }

  let nextNum = maxNum + 1;
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const candidate = `TRIP-${String(nextNum).padStart(4, "0")}`;
    const exists = await tx.deliveryTrip.findUnique({
      where: { tripNo: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextNum++;
  }
  throw new Error("Failed to generate unique trip number after 1000 attempts.");
}

export async function generateNextTripNo(client?: any): Promise<string> {
  if (client) {
    return internalGenerateNextTripNo(client);
  }
  return prisma.$transaction(async (tx) => {
    return internalGenerateNextTripNo(tx);
  });
}

async function internalGenerateNextRequestCode(tx: any): Promise<string> {
  // Acquire transaction-scoped advisory lock to serialize request sequence generation
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(718292);");

  const currentYear = new Date().getFullYear();
  const shortYear = String(currentYear).slice(-2);
  const prefix = `REQ-${shortYear}-`;

  const latestReq = await tx.vehicleRequest.findFirst({
    where: { requestCode: { startsWith: prefix } },
    orderBy: { id: "desc" },
    select: { id: true, requestCode: true },
  });

  let maxNum = 0;
  if (latestReq?.requestCode) {
    const parts = latestReq.requestCode.split("-");
    const lastPart = parts[parts.length - 1];
    const parsed = parseInt(lastPart, 10);
    if (!isNaN(parsed)) maxNum = parsed;
  }

  let nextNum = maxNum + 1;
  let attempts = 0;
  while (attempts < 1000) {
    attempts++;
    const candidate = `${prefix}${String(nextNum).padStart(4, "0")}`;
    const exists = await tx.vehicleRequest.findUnique({
      where: { requestCode: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextNum++;
  }
  throw new Error("Failed to generate unique request code after 1000 attempts.");
}

export async function generateNextRequestCode(client?: any): Promise<string> {
  if (client) {
    return internalGenerateNextRequestCode(client);
  }
  return prisma.$transaction(async (tx) => {
    return internalGenerateNextRequestCode(tx);
  });
}


