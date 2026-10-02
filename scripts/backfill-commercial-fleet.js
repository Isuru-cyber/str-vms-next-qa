const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const v1 = await prisma.$executeRawUnsafe(`UPDATE vehicles SET vehicle_category = 'Lorry' WHERE vehicle_category IS NULL`);
  const v2 = await prisma.$executeRawUnsafe(`UPDATE vehicles SET ownership_type = 'COMMERCIAL' WHERE ownership_type IS NULL`);
  console.log(`Updated vehicles with vehicleCategory='Lorry' and ownershipType='COMMERCIAL': ${v1}, ${v2}`);

  const d1 = await prisma.$executeRawUnsafe(`UPDATE drivers SET driver_type = 'COMMERCIAL' WHERE driver_type IS NULL`);
  console.log(`Updated drivers with driverType='COMMERCIAL': ${d1}`);
}

backfill().catch(console.error).finally(() => prisma.$disconnect());
