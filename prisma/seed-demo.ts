import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Comprehensive STR-VMS Demo Data across all 7 scenarios...\n");

  // Ensure default requester and admin users exist
  const requester = await prisma.user.findFirst({ where: { roleId: 4 } });
  const admin = await prisma.user.findFirst({ where: { roleId: 1 } });
  const requesterId = requester ? requester.id : 1;
  const adminId = admin ? admin.id : 1;

  // Retrieve vehicles
  const vehicle1 = await prisma.vehicle.findFirst({ where: { vehicleNumber: "PY-3548" } });
  const vehicle5 = await prisma.vehicle.findFirst({ where: { vehicleNumber: "GN-4557" } });
  const vehicle6 = await prisma.vehicle.findFirst({ where: { vehicleNumber: "68-3470" } });
  const vehicle7 = await prisma.vehicle.findFirst({ where: { vehicleNumber: "GB-6111" } });
  const vehicle10 = await prisma.vehicle.findFirst({ where: { vehicleNumber: "GE-5975" } });

  // Retrieve drivers
  const driver1 = await prisma.driver.findFirst({ where: { name: "Shantha" } });
  const driver5 = await prisma.driver.findFirst({ where: { name: "Kumara" } });
  const driver6 = await prisma.driver.findFirst({ where: { name: "Wijethunga" } });
  const driver7 = await prisma.driver.findFirst({ where: { name: "Viraj" } });
  const driver10 = await prisma.driver.findFirst({ where: { name: "Layanal" } });

  // Retrieve route
  const route = await prisma.route.findFirst();
  const routeId = route?.id || 1;

  // Common dates
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);

  // Helper to upsert request
  async function createOrUpdateRequest(data: any) {
    const existing = await prisma.vehicleRequest.findUnique({ where: { requestCode: data.requestCode } });
    if (existing) {
      return await prisma.vehicleRequest.update({ where: { id: existing.id }, data });
    }
    return await prisma.vehicleRequest.create({ data });
  }

  // Helper to upsert delivery trip
  async function createOrUpdateTrip(data: any) {
    const existing = await prisma.deliveryTrip.findUnique({ where: { tripNo: data.tripNo } });
    if (existing) {
      return await prisma.deliveryTrip.update({ where: { id: existing.id }, data });
    }
    return await prisma.deliveryTrip.create({ data });
  }

  // =========================================================================
  // SCENARIO 1: Unallocated Pending Requests (Submitted, awaiting allocation)
  // =========================================================================
  console.log("📦 1. Seeding Scenario 1: Unallocated Pending Requests...");
  await createOrUpdateRequest({
    requestCode: "REQ-2026-0101",
    requesterId,
    plantId: 1, // STR1
    operationId: 2, // FG
    subOperationId: 2,
    fromLocationId: 124, // STR1 - BIYAGAMA
    toLocationId: 163, // HORANA BODYLINE
    contactPerson: "Nimal Perera",
    contactPhone: "0771234567",
    itemDescription: "Finished Fabric Rolls - Charcoal Black & Navy",
    boxCount: 48,
    requiredKg: 950.0,
    requiredCbm: 3.8,
    requiredDate: today,
    requiredTime: "10:00 AM",
    invoiceNumbers: "INV-STR-9101, INV-STR-9102",
    status: "SUBMITTED",
    urgency: "Normal",
    remarks: "Priority order for customer cut-plan execution",
  });

  await createOrUpdateRequest({
    requestCode: "REQ-2026-0102",
    requesterId,
    plantId: 2, // STR2
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 153, // STR2 - MT LAVINIA
    toLocationId: 10, // BENJI BINGIRIYA
    contactPerson: "Kamal Gunaratne",
    contactPhone: "0719876543",
    itemDescription: "Elastic Webbing Tapes - Grade A Standard",
    boxCount: 35,
    requiredKg: 520.0,
    requiredCbm: 2.1,
    requiredDate: today,
    requiredTime: "11:30 AM",
    invoiceNumbers: "INV-STR-9105",
    status: "SUBMITTED",
    urgency: "Normal",
  });

  await createOrUpdateRequest({
    requestCode: "REQ-2026-0103",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 1,
    fromLocationId: 124,
    toLocationId: 38, // EXPO KADANA
    contactPerson: "Sarath Fonseka",
    contactPhone: "0763344556",
    itemDescription: "Raw Yarn Spools & Dyes Batch #4",
    boxCount: 20,
    requiredKg: 380.0,
    requiredCbm: 1.5,
    requiredDate: today,
    requiredTime: "02:00 PM",
    invoiceNumbers: "INV-STR-9108",
    status: "SUBMITTED",
    urgency: "Urgent",
  });

  // =========================================================================
  // SCENARIO 2: Allocated Trip in Combine Workbench (Assigned, planning stage)
  // =========================================================================
  console.log("🚚 2. Seeding Scenario 2: Allocated Trip in Combine Workbench (TRIP-2026-0901)...");
  const trip1 = await createOrUpdateTrip({
    tripNo: "TRIP-2026-0901",
    vehicleId: vehicle1?.id || 1,
    driverId: driver1?.id || 1,
    routeId,
    plannedKm: 75.5,
    status: "ASSIGNED",
    plannedStart: today,
  });

  const req2A = await createOrUpdateRequest({
    requestCode: "REQ-2026-0104",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 163,
    contactPerson: "Ruwan Silva",
    contactPhone: "0774433221",
    itemDescription: "Knitted Single Jersey Elastic Batches",
    boxCount: 30,
    requiredKg: 600.0,
    requiredCbm: 2.4,
    requiredDate: today,
    requiredTime: "09:00 AM",
    invoiceNumbers: "INV-STR-9201",
    status: "ALLOCATED",
  });

  const req2B = await createOrUpdateRequest({
    requestCode: "REQ-2026-0105",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 163,
    contactPerson: "Ruwan Silva",
    contactPhone: "0774433221",
    itemDescription: "Interlock Lycra Spools - Carton Package",
    boxCount: 15,
    requiredKg: 250.0,
    requiredCbm: 1.0,
    requiredDate: today,
    requiredTime: "09:30 AM",
    invoiceNumbers: "INV-STR-9202",
    status: "ALLOCATED",
  });

  // Link requests to trip 1
  await prisma.tripRequest.deleteMany({ where: { tripId: trip1.id } });
  await prisma.tripRequest.createMany({
    data: [
      { tripId: trip1.id, requestId: req2A.id, loadingSequence: 1 },
      { tripId: trip1.id, requestId: req2B.id, loadingSequence: 2 },
    ],
  });

  // =========================================================================
  // SCENARIO 3: Dispatched Trip - Gate Pass Pending (No Gate Pass entered yet)
  // =========================================================================
  console.log("🚚 3. Seeding Scenario 3: Dispatched Trip with Gate Pass Pending (TRIP-2026-0902)...");
  const trip2 = await createOrUpdateTrip({
    tripNo: "TRIP-2026-0902",
    vehicleId: vehicle5?.id || 5,
    driverId: driver5?.id || 5,
    routeId,
    plannedKm: 82.0,
    status: "DISPATCHED",
    plannedStart: today,
    actualStart: today,
  });

  const req3 = await createOrUpdateRequest({
    requestCode: "REQ-2026-0106",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 10,
    contactPerson: "Prasanna Jayakody",
    contactPhone: "0715566778",
    itemDescription: "Heavy Weight Rib Fabric Consignment",
    boxCount: 55,
    requiredKg: 980.0,
    requiredCbm: 3.9,
    requiredDate: today,
    requiredTime: "08:30 AM",
    invoiceNumbers: "INV-STR-9301, INV-STR-9302",
    status: "DISPATCHED",
  });

  await prisma.tripRequest.deleteMany({ where: { tripId: trip2.id } });
  await prisma.tripRequest.create({
    data: { tripId: trip2.id, requestId: req3.id, loadingSequence: 1 },
  });
  // Clear any gate passes so this trip remains "Gate Pass Pending"
  await prisma.tripGatePass.deleteMany({ where: { tripId: trip2.id } });

  // =========================================================================
  // SCENARIO 4: Dispatched Trip - 1 or 2 Gate Passes (Standard Dispatch)
  // =========================================================================
  console.log("🚚 4. Seeding Scenario 4: Dispatched Trip with 2 Gate Passes (TRIP-2026-0903)...");
  const trip3 = await createOrUpdateTrip({
    tripNo: "TRIP-2026-0903",
    vehicleId: vehicle6?.id || 6,
    driverId: driver6?.id || 6,
    routeId,
    plannedKm: 110.0,
    status: "DISPATCHED",
    plannedStart: today,
    actualStart: today,
  });

  const req4 = await createOrUpdateRequest({
    requestCode: "REQ-2026-0107",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 94, // RM RUSALU KATANA
    contactPerson: "Sunil Shantha",
    contactPhone: "0751122334",
    itemDescription: "Finished Greige Rolls & Dye Packages",
    boxCount: 60,
    requiredKg: 1150.0,
    requiredCbm: 4.5,
    requiredDate: today,
    requiredTime: "07:30 AM",
    invoiceNumbers: "INV-STR-9401, INV-STR-9402",
    status: "DISPATCHED",
  });

  await prisma.tripRequest.deleteMany({ where: { tripId: trip3.id } });
  await prisma.tripRequest.create({
    data: { tripId: trip3.id, requestId: req4.id, loadingSequence: 1 },
  });

  await prisma.tripGatePass.deleteMany({ where: { tripId: trip3.id } });
  await prisma.tripGatePass.createMany({
    data: [
      { tripId: trip3.id, requestId: req4.id, gatePassNo: "GP-9011", enteredBy: adminId, status: "ENTERED" },
      { tripId: trip3.id, requestId: req4.id, gatePassNo: "GP-9012", enteredBy: adminId, status: "ENTERED" },
    ],
  });

  // =========================================================================
  // SCENARIO 5: Dispatched Trip with 10 GATE PASSES! (Stress-Test Scenario)
  // =========================================================================
  console.log("🚚 5. Seeding Scenario 5: Multi-Gate Pass Stress Test with 10 Gate Passes (TRIP-2026-0904)...");
  const trip4 = await createOrUpdateTrip({
    tripNo: "TRIP-2026-0904",
    vehicleId: vehicle10?.id || 10,
    driverId: driver10?.id || 10,
    routeId,
    plannedKm: 145.0,
    status: "DISPATCHED",
    plannedStart: today,
    actualStart: today,
  });

  const req5A = await createOrUpdateRequest({
    requestCode: "REQ-2026-0108",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 100, // SLIMLINE PANNALA
    contactPerson: "Dinesh Chandimal",
    contactPhone: "0778899001",
    itemDescription: "Bulk High-Density Polyester Yarns",
    boxCount: 40,
    requiredKg: 800.0,
    requiredCbm: 3.2,
    requiredDate: today,
    requiredTime: "06:00 AM",
    invoiceNumbers: "INV-STR-8801, INV-STR-8802",
    status: "DISPATCHED",
  });

  const req5B = await createOrUpdateRequest({
    requestCode: "REQ-2026-0109",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 100,
    contactPerson: "Dinesh Chandimal",
    contactPhone: "0778899001",
    itemDescription: "Elastomeric Thread Reels - Master Packaging",
    boxCount: 35,
    requiredKg: 650.0,
    requiredCbm: 2.8,
    requiredDate: today,
    requiredTime: "06:30 AM",
    invoiceNumbers: "INV-STR-8803, INV-STR-8804, INV-STR-8805",
    status: "DISPATCHED",
  });

  await prisma.tripRequest.deleteMany({ where: { tripId: trip4.id } });
  await prisma.tripRequest.createMany({
    data: [
      { tripId: trip4.id, requestId: req5A.id, loadingSequence: 1 },
      { tripId: trip4.id, requestId: req5B.id, loadingSequence: 2 },
    ],
  });

  // Seed EXACTLY 10 Gate Passes to test popover & max-width
  await prisma.tripGatePass.deleteMany({ where: { tripId: trip4.id } });
  const tenGatePasses = [
    "GP-8801", "GP-8802", "GP-8803", "GP-8804", "GP-8805",
    "GP-8806", "GP-8807", "GP-8808", "GP-8809", "GP-8810",
  ];
  for (const gpNo of tenGatePasses) {
    await prisma.tripGatePass.create({
      data: {
        tripId: trip4.id,
        requestId: req5A.id,
        gatePassNo: gpNo,
        enteredBy: adminId,
        status: "ENTERED",
        remarks: `Security clearance serial ${gpNo}`,
      },
    });
  }

  // =========================================================================
  // SCENARIO 6: Dispatched Trip Ready for Finalization (Reconciled with Datatex)
  // =========================================================================
  console.log("🚚 6. Seeding Scenario 6: Reconciled Trip Ready for Finalize (TRIP-2026-0905)...");
  const trip5 = await createOrUpdateTrip({
    tripNo: "TRIP-2026-0905",
    vehicleId: vehicle7?.id || 7,
    driverId: driver7?.id || 7,
    routeId,
    plannedKm: 95.0,
    actualKm: 94.8,
    status: "DISPATCHED",
    plannedStart: yesterday,
    actualStart: yesterday,
  });

  const req6 = await createOrUpdateRequest({
    requestCode: "REQ-2026-0112",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 163,
    contactPerson: "Niroshan Dickwella",
    contactPhone: "0713322110",
    itemDescription: "Export Grade Nylon Webbing",
    boxCount: 50,
    requiredKg: 1100.0,
    requiredCbm: 4.2,
    requiredDate: yesterday,
    requiredTime: "07:00 AM",
    invoiceNumbers: "INV-STR-7721, INV-STR-7722",
    status: "DISPATCHED",
  });

  await prisma.tripRequest.deleteMany({ where: { tripId: trip5.id } });
  await prisma.tripRequest.create({
    data: { tripId: trip5.id, requestId: req6.id, loadingSequence: 1 },
  });

  await prisma.tripGatePass.deleteMany({ where: { tripId: trip5.id } });
  await prisma.tripGatePass.createMany({
    data: [
      { tripId: trip5.id, requestId: req6.id, gatePassNo: "GP-7721", enteredBy: adminId, status: "RECONCILED" },
      { tripId: trip5.id, requestId: req6.id, gatePassNo: "GP-7722", enteredBy: adminId, status: "RECONCILED" },
    ],
  });

  // Seed Matched Datatex Reconciliation Record
  await prisma.tripReconciliation.deleteMany({ where: { tripId: trip5.id } });
  await prisma.tripReconciliation.create({
    data: {
      tripId: trip5.id,
      gatePassNo: "GP-7721",
      actualVehicleNo: vehicle7?.vehicleNumber || "GB-6111",
      actualBoxes: 50,
      actualKg: 1100.0,
      actualCbm: 4.2,
      invoiceNumbers: "INV-STR-7721, INV-STR-7722",
      customerName: "BODYLINE (PVT) LTD - HORANA",
      dispatchedDate: yesterday.toISOString().split("T")[0],
      matchStatus: "MATCHED",
      varianceRemarks: "Datatex dispatch register 100% matched with security gate passes.",
      reconciledBy: adminId,
    },
  });

  // =========================================================================
  // SCENARIO 7: Completed Trips in POD Management (Finalized with Invoices)
  // =========================================================================
  console.log("🚚 7. Seeding Scenario 7: Completed Trip with POD Commercial Invoices (TRIP-2026-0906)...");
  const trip6 = await createOrUpdateTrip({
    tripNo: "TRIP-2026-0906",
    vehicleId: vehicle1?.id || 1,
    driverId: driver1?.id || 1,
    routeId,
    plannedKm: 75.5,
    actualKm: 76.0,
    status: "COMPLETED",
    plannedStart: yesterday,
    actualStart: yesterday,
    actualEnd: yesterday,
    completedAt: yesterday,
    completedBy: adminId,
  });

  const req7 = await createOrUpdateRequest({
    requestCode: "REQ-2026-0113",
    requesterId,
    plantId: 1,
    operationId: 2,
    subOperationId: 2,
    fromLocationId: 124,
    toLocationId: 163,
    contactPerson: "Kusal Perera",
    contactPhone: "0770099887",
    itemDescription: "Delivered Custom Elastic Bands Batch #99",
    boxCount: 42,
    requiredKg: 780.0,
    requiredCbm: 3.1,
    requiredDate: yesterday,
    requiredTime: "06:00 AM",
    invoiceNumbers: "INV-STR-6601, INV-STR-6602, INV-STR-6603",
    status: "COMPLETED",
  });

  await prisma.tripRequest.deleteMany({ where: { tripId: trip6.id } });
  await prisma.tripRequest.create({
    data: { tripId: trip6.id, requestId: req7.id, loadingSequence: 1 },
  });

  await prisma.tripGatePass.deleteMany({ where: { tripId: trip6.id } });
  await prisma.tripGatePass.create({
    data: {
      tripId: trip6.id,
      requestId: req7.id,
      gatePassNo: "GP-6601",
      enteredBy: adminId,
      status: "RECONCILED",
    },
  });

  // Seed Invoices into InvoicePod (1 Received, 2 Pending Return)
  await prisma.invoicePod.deleteMany({ where: { tripId: trip6.id } });
  await prisma.invoicePod.createMany({
    data: [
      {
        tripId: trip6.id,
        requestId: req7.id,
        invoiceNumber: "INV-STR-6601",
        vehicleNumber: vehicle1?.vehicleNumber || "PY-3548",
        driverName: driver1?.name || "Shantha",
        driverMobile: driver1?.mobile || "779455099",
        locationName: "HORANA BODYLINE",
        isReceived: true,
        receivedAt: yesterday,
        receivedByName: "Shantha (Driver)",
        remarks: "Signed original customer copy returned to stores",
      },
      {
        tripId: trip6.id,
        requestId: req7.id,
        invoiceNumber: "INV-STR-6602",
        vehicleNumber: vehicle1?.vehicleNumber || "PY-3548",
        driverName: driver1?.name || "Shantha",
        driverMobile: driver1?.mobile || "779455099",
        locationName: "HORANA BODYLINE",
        isReceived: false,
        remarks: "Driver pending physical handover",
      },
      {
        tripId: trip6.id,
        requestId: req7.id,
        invoiceNumber: "INV-STR-6603",
        vehicleNumber: vehicle1?.vehicleNumber || "PY-3548",
        driverName: driver1?.name || "Shantha",
        driverMobile: driver1?.mobile || "779455099",
        locationName: "HORANA BODYLINE",
        isReceived: false,
        remarks: "Driver pending physical handover",
      },
    ],
  });

  console.log("\n✅ All 7 Demonstration Scenarios Seeded Successfully!");
  console.log("---------------------------------------------------------------");
  console.log("1. Unallocated Requests     : REQ-2026-0101, 0102, 0103 (/requests, /allocations/fg)");
  console.log("2. Allocated Trip (Assigned): TRIP-2026-0901 (/allocations/fg/combine)");
  console.log("3. Dispatched (GP Pending)  : TRIP-2026-0902 (/dispatch/deck)");
  console.log("4. Dispatched (2 GatePasses): TRIP-2026-0903 (GP-9011, GP-9012)");
  console.log("5. Dispatched (10 GatePasses): TRIP-2026-0904 (GP-8801 - GP-8810) [Popover & Max-Width Test]");
  console.log("6. Reconciled & Ready Final : TRIP-2026-0905 (/reconciliation - Ready for Finalize)");
  console.log("7. Completed & POD Invoices : TRIP-2026-0906 (/pod - 1 Received, 2 Pending)");
  console.log("---------------------------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("❌ Demo data seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
