require('dotenv').config();
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const rows = await prisma.$queryRawUnsafe('SELECT id, vehicle_number, vehicle_category, ownership_type, payment_basis FROM vehicles LIMIT 5');
  console.log('Vehicles sample:', rows);
}

check().catch(console.error).finally(() => prisma.$disconnect());
