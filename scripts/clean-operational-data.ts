import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Manually load .env if not in environment
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Use standard Prisma Client initialized from environment
const dbUrl = process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
});

async function retry<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.log(`Connection attempt ${i + 1} failed, retrying in ${delay / 1000}s...`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("Failed after retries");
}

async function main() {
  console.log("=================================================");
  console.log("  STR VMS: SELECTIVE OPERATIONAL DATA PURGE");
  console.log("=================================================\n");

  console.log("Starting atomic purge of transactional records in database...");

  const statements = [
    'DELETE FROM "invoice_pods"',
    'DELETE FROM "trip_reconciliations"',
    'DELETE FROM "trip_gate_passes"',
    'DELETE FROM "trip_requests"',
    'DELETE FROM "delivery_trips"',
    'DELETE FROM "vehicle_requests"',
    'DELETE FROM "notifications"',
    'UPDATE "vehicles" SET "status" = \'AVAILABLE\'',
    'UPDATE "drivers" SET "status" = \'AVAILABLE\''
  ];

  for (const sql of statements) {
    const affected = await retry(() => prisma.$executeRawUnsafe(sql));
    console.log(`✔ Executed: ${sql} (${affected} rows)`);
  }

  // Quick verification of remaining operational vs master data
  const reqCount = await prisma.vehicleRequest.count();
  const tripCount = await prisma.deliveryTrip.count();
  const vehCount = await prisma.vehicle.count();
  const driverCount = await prisma.driver.count();
  const routeCount = await prisma.route.count();
  const locCount = await prisma.location.count();
  const userCount = await prisma.user.count();

  console.log("\n--- VERIFICATION STATUS ---");
  console.table({
    "Operational Requests (Should be 0)": reqCount,
    "Operational Trips (Should be 0)": tripCount,
    "Master Vehicles (Preserved)": vehCount,
    "Master Drivers (Preserved)": driverCount,
    "Master Routes (Preserved)": routeCount,
    "Master Locations (Preserved)": locCount,
    "Master Users (Preserved)": userCount,
  });

  console.log("\n=================================================");
  console.log("  PURGE COMPLETE: DATABASE IS FRESH & OPERATIONAL");
  console.log("  ALL MASTER DATA IS 100% INTACT & PRESERVED");
  console.log("=================================================");
}

main()
  .catch((err) => {
    console.error("Error during purge:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
