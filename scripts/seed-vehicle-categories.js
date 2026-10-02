const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  let cat = await prisma.masterCategory.findUnique({ where: { code: 'VEHICLE_CATEGORY' } });
  if (!cat) {
    cat = await prisma.masterCategory.create({
      data: { code: 'VEHICLE_CATEGORY', name: 'Vehicle Category' }
    });
    console.log('Created MasterCategory VEHICLE_CATEGORY:', cat.id);
  } else {
    console.log('MasterCategory VEHICLE_CATEGORY already exists:', cat.id);
  }

  const defaults = [
    { code: 'LORRY', name: 'Lorry', sortOrder: 1 },
    { code: 'BIKE', name: 'Bike', sortOrder: 2 },
    { code: 'THREEWHEEL', name: 'Threewheel', sortOrder: 3 },
    { code: 'VAN', name: 'Van', sortOrder: 4 },
  ];

  for (const d of defaults) {
    const existing = await prisma.masterData.findFirst({
      where: { categoryId: cat.id, code: d.code }
    });
    if (!existing) {
      await prisma.masterData.create({
        data: {
          categoryId: cat.id,
          code: d.code,
          name: d.name,
          sortOrder: d.sortOrder,
          active: 1
        }
      });
      console.log('Created MasterData item:', d.name);
    } else {
      console.log('Item already exists:', d.name);
    }
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect());
