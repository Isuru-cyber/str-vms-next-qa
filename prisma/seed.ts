import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting STR-VMS database seeding...");

  // 1. Roles
  const roles = [
    { id: 1, name: "Super Admin", code: "SUPER_ADMIN", description: "Full unrestricted system access" },
    { id: 2, name: "Admin", code: "ADMIN", description: "Operational administrator with user & fleet management" },
    { id: 3, name: "Power User", code: "POWER_USER", description: "Operation and plant allocation lead" },
    { id: 4, name: "Entry User", code: "ENTRY_USER", description: "Request creation and tracking within assigned scopes" },
    { id: 5, name: "View Only", code: "VIEW_USER", description: "Read-only visibility for reporting and tracking" },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
  }
  console.log("✅ Roles seeded.");

  // 2. Plants
  const plants = [
    { id: 1, code: "STR1", name: "Plant STR1", businessGroup: "ELASTIC" },
    { id: 2, code: "STR2", name: "Plant STR2", businessGroup: "ELASTIC" },
    { id: 3, code: "STR3", name: "Plant STR3", businessGroup: "ELASTIC" },
    { id: 4, code: "YD", name: "Plant YD", businessGroup: "YARN" },
    { id: 5, code: "CP", name: "Plant CP", businessGroup: "YARN" },
  ];
  for (const p of plants) {
    await prisma.plant.upsert({
      where: { code: p.code },
      update: { name: p.name, businessGroup: p.businessGroup },
      create: p,
    });
  }
  console.log("✅ Plants seeded.");

  // 3. Operations
  const operations = [
    { id: 1, code: "SHUTTLE", name: "Shuttle Operation" },
    { id: 2, code: "FG_OTHER", name: "FG & Other" },
  ];
  for (const o of operations) {
    await prisma.operation.upsert({
      where: { code: o.code },
      update: { name: o.name },
      create: o,
    });
  }
  console.log("✅ Operations seeded.");

  // 4. Master Categories
  const masterCategories = [
    { id: 1, code: "SUB_OPERATION", name: "Sub Operation" },
    { id: 2, code: "VEHICLE_TYPE", name: "Vehicle Type" },
  ];
  for (const mc of masterCategories) {
    await prisma.masterCategory.upsert({
      where: { code: mc.code },
      update: { name: mc.name },
      create: mc,
    });
  }
  console.log("✅ Master Categories seeded.");

  // 5. Master Data
  const masterDataList = [
    { id: 1, categoryId: 1, code: "RM", name: "Raw Material", sortOrder: 1 },
    { id: 2, categoryId: 1, code: "FG", name: "Finished Goods", sortOrder: 2 },
    { id: 3, categoryId: 1, code: "DYE_CHE", name: "Dyes & Chemicals", sortOrder: 3 },
    { id: 4, categoryId: 1, code: "MACHINERY", name: "Machinery", sortOrder: 4 },
    { id: 5, categoryId: 1, code: "MAINTENANCE", name: "Maintenance", sortOrder: 5 },
    { id: 6, categoryId: 1, code: "GREIGE", name: "Greige", sortOrder: 6 },
    { id: 7, categoryId: 1, code: "SAMPLE", name: "Sample", sortOrder: 7 },
    { id: 8, categoryId: 1, code: "OTHER", name: "Other", sortOrder: 8 },
    { id: 17, categoryId: 2, code: "8.5_FT", name: "8.5 ft", defaultFuelConsumption: 18.0, defaultRunningCostPerKm: 18.07, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 1 },
    { id: 18, categoryId: 2, code: "8.5_FT_DB", name: "8.5 ft - DB", defaultFuelConsumption: 10.0, defaultRunningCostPerKm: 18.07, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 2 },
    { id: 19, categoryId: 2, code: "9.5_FT", name: "9.5 ft", defaultFuelConsumption: 10.0, defaultRunningCostPerKm: 20.5, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 3 },
    { id: 20, categoryId: 2, code: "10_FT", name: "10 ft", defaultFuelConsumption: 10.0, defaultRunningCostPerKm: 20.5, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 4 },
    { id: 21, categoryId: 2, code: "10.5_FT", name: "10.5 ft", defaultFuelConsumption: 10.0, defaultRunningCostPerKm: 20.5, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 5 },
    { id: 22, categoryId: 2, code: "12.5_FT", name: "12.5 ft", defaultFuelConsumption: 8.0, defaultRunningCostPerKm: 20.5, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 6 },
    { id: 23, categoryId: 2, code: "14.5_FT", name: "14.5 ft", defaultFuelConsumption: 8.0, defaultRunningCostPerKm: 27.02, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 7 },
    { id: 24, categoryId: 2, code: "16.5_FT", name: "16.5 ft", defaultFuelConsumption: 8.0, defaultRunningCostPerKm: 27.02, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 8 },
    { id: 25, categoryId: 2, code: "18.50_FT", name: "18.50 ft", defaultFuelConsumption: 7.0, defaultRunningCostPerKm: 27.02, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 9 },
    { id: 26, categoryId: 2, code: "20_FT", name: "20 ft", defaultFuelConsumption: 5.0, defaultRunningCostPerKm: 27.02, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1995.35, sortOrder: 10 },
    { id: 27, categoryId: 2, code: "40_FT", name: "40 ft", defaultFuelConsumption: 2.0, defaultRunningCostPerKm: 32.0, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 2500.0, sortOrder: 11 },
    { id: 30, categoryId: 2, code: "40_FT___HC", name: "40 ft - HC", defaultFuelConsumption: 1.5, defaultRunningCostPerKm: 35.0, defaultProfitPerKm: 15.0, defaultFixedCostPerDay: 1795.36, sortOrder: 99 },
  ];
  for (const md of masterDataList) {
    await prisma.masterData.upsert({
      where: { categoryId_code: { categoryId: md.categoryId, code: md.code } },
      update: md,
      create: md,
    });
  }
  console.log("✅ Master Data seeded.");

  // 6. System Settings
  const settings = [
    { settingKey: "COMPANY_NAME", settingValue: "STR Transport Ltd" },
    { settingKey: "SYSTEM_NAME", settingValue: "Vehicle Management System" },
    { settingKey: "DEFAULT_KM_RATE", settingValue: "150.00" },
    { settingKey: "REQUEST_PREFIX", settingValue: "REQ-" },
    { settingKey: "TRIP_PREFIX", settingValue: "TRIP-" },
    { settingKey: "SESSION_TIMEOUT_MINUTES", settingValue: "30" },
    { settingKey: "SESSION_TIMEOUT_ALERT_MINUTES", settingValue: "2" },
    { settingKey: "LIMIT_GLOBAL", settingValue: "100" },
    { settingKey: "LIMIT_REQUESTS", settingValue: "100" },
    { settingKey: "LIMIT_ALLOCATIONS", settingValue: "100" },
    { settingKey: "LIMIT_VEHICLES", settingValue: "0" },
    { settingKey: "LIMIT_DRIVERS", settingValue: "0" },
    { settingKey: "LIMIT_LOGS", settingValue: "500" },
  ];
  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { settingKey: s.settingKey },
      update: { settingValue: s.settingValue },
      create: s,
    });
  }
  console.log("✅ System Settings seeded.");

  // 7. Monthly Fuel Rates
  const fuelRates = [
    { periodMonth: "2026-07", dieselRate: 380.0, isLocked: 1, notes: "July 2026 Locked Fuel Rate" },
    { periodMonth: "2026-08", dieselRate: 382.0, isLocked: 0, notes: "August 2026 Standard Fuel Rate" },
    { periodMonth: "2026-09", dieselRate: 390.0, isLocked: 0, notes: "September 2026 Current Fuel Rate" },
  ];
  for (const fr of fuelRates) {
    await prisma.monthlyFuelRate.upsert({
      where: { periodMonth: fr.periodMonth },
      update: fr,
      create: fr,
    });
  }
  console.log("✅ Monthly Fuel Rates seeded.");

  // 8. Mail Templates
  const templates = [
    {
      templateKey: "allocation_confirmed",
      name: "Vehicle Allocation Confirmation",
      description: "Email notification template sent/drafted to requesters when vehicle allocation is confirmed.",
      subject: "Vehicle Allocation Confirmed: Trip {trip_no} | {vehicle_number} - {route_name}",
      body: "Dear Requester(s),\n\nYour transportation request has been successfully allocated and scheduled for dispatch.\n\nTRIP DETAILS:\nTrip No: {trip_no}\nRoute: {route_name}\nVehicle: {vehicle_number}\nDriver: {driver_name} ({driver_mobile})\n\nLoading Order:\n{requests_breakdown}",
    },
    {
      templateKey: "dispatch_departure_notice",
      name: "Dispatch & Driver Gate-Pass Notification",
      description: "Direct driver and vehicle gate-pass dispatch alert.",
      subject: "[DISPATCH & GATE PASS] Vehicle {vehicle_number} | Trip #{trip_no} ({route_name})",
      body: "GATE PASS & DISPATCH CLEARANCE NOTICE\n\nDriver: {driver_name} (NIC: {driver_nic})\nVehicle: {vehicle_number}\nRoute: {route_name}\n\nSTR Logistics Control",
    },
    {
      templateKey: "request_rejected",
      name: "Request Rejection Notice",
      description: "Dispatched when Central Fleet Dispatch rejects a vehicle request.",
      subject: "[STR VMS] Action Required: Vehicle Request {request_code} Rejected",
      body: "Dear {requester_name},\n\nYour Vehicle Transport Request {request_code} has been REJECTED by Central Fleet Dispatch.\n\nReason: {rejection_reason}\n\nSTR Logistics",
    },
    {
      templateKey: "request_cancelled",
      name: "Request Cancellation Notice",
      description: "Dispatched when a vehicle request is cancelled.",
      subject: "[STR VMS] Notice: Vehicle Request {request_code} Cancelled",
      body: "Dear {requester_name},\n\nVehicle Transport Request {request_code} has been CANCELLED.\n\nReason: {cancellation_reason}",
    },
  ];
  for (const t of templates) {
    await prisma.mailTemplate.upsert({
      where: { templateKey: t.templateKey },
      update: t,
      create: t,
    });
  }
  console.log("✅ Mail Templates seeded.");

  // 9. Key Locations (including origins and customer stops)
  const locations = [
    { id: 124, locationName: "STR 1 - BIYAGAMA", businessGroup: "ELASTIC", locationType: "PLANT", plantId: 1, isOrigin: 1, latitude: 6.98000000, longitude: 79.99000000 },
    { id: 153, locationName: "STR 2 - MT LAVINIA", businessGroup: "ELASTIC", locationType: "PLANT", plantId: 2, isOrigin: 1, latitude: 6.83740000, longitude: 79.86600000 },
    { id: 154, locationName: "STR 3 - MILLANIYA", businessGroup: "ELASTIC", locationType: "PLANT", plantId: 3, isOrigin: 1, latitude: 7.49557920, longitude: 80.37837993 },
    { id: 152, locationName: "YD - BIYAGAMA", businessGroup: "YARN", locationType: "PLANT", plantId: 4, isOrigin: 1, latitude: 6.97700000, longitude: 79.98700000 },
    { id: 151, locationName: "CP - BIYAGAMA", businessGroup: "YARN", locationType: "PLANT", plantId: 5, isOrigin: 1, latitude: 6.98300000, longitude: 79.99300000 },
    { id: 155, locationName: "BNS 3PL - PATTIVILA", businessGroup: "ELASTIC", locationType: "WAREHOUSE", isOrigin: 1, latitude: 6.97300000, longitude: 80.00500000 },
    { id: 164, locationName: "EFL - PELIYAGODA", businessGroup: "ELASTIC", locationType: "WAREHOUSE", isOrigin: 1, latitude: 6.95945366, longitude: 79.88768065 },
    { id: 10, locationName: "BENJI BINGIRIYA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0, latitude: 7.32800000, longitude: 80.02410000 },
    { id: 38, locationName: "EXPO KADANA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0, latitude: 7.04250000, longitude: 79.89700000 },
    { id: 94, locationName: "RM RUSALU KATANA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0, latitude: 7.20600000, longitude: 79.88500000 },
    { id: 98, locationName: "SIRIO BADALGAMA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0, latitude: 7.25800000, longitude: 79.98000000 },
    { id: 100, locationName: "SLIMLINE PANNALA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0, latitude: 7.36000000, longitude: 80.05500000 },
    { id: 163, locationName: "HORANA BODYLINE", displayName: "BODYLINE HORANA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0, latitude: 6.73174320, longitude: 80.10573220, address: "BODYLINE (PVT) LTD, Ratnapura Road, Horana 12400" },
    { id: 166, locationName: "UNICHELA PANADURA", displayName: "UNICHELA PANADURA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0 },
    { id: 167, locationName: "MDS RATMALANA", displayName: "MDS RATMALANA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0 },
    { id: 168, locationName: "INTIMO BIYAGAMA", displayName: "INTIMO BIYAGAMA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0 },
    { id: 170, locationName: "MAS Fabrics Thulhiriya", displayName: "MAS Fabrics Thulhiriya", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0 },
    { id: 171, locationName: "OMEGALINE SANDALANKAWA", displayName: "OMEGALINE SANDALANKAWA", businessGroup: "ELASTIC", locationType: "CUSTOMER", isOrigin: 0 },
  ];
  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: loc,
      create: loc,
    });
  }
  console.log("✅ Key Locations seeded.");

  // 10. Vehicles
  const vehicles = [
    { id: 1, vehicleNumber: "PY-3548", vehicleType: "8.5 ft", operationCategoryId: 2, maxPayloadKg: 800.0, maxVolumeCbm: 3.5, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 18.0, runningCostPerKm: 18.07, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 180000.0, extraKmRate: 75.0 },
    { id: 2, vehicleNumber: "PP-9565", vehicleType: "8.5 ft", operationCategoryId: 2, maxPayloadKg: 800.0, maxVolumeCbm: 3.5, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 18.0, runningCostPerKm: 18.07, profitPerKm: 15.0, fixedCostPerDay: 1795.36 },
    { id: 3, vehicleNumber: "DAB -0669", vehicleType: "8.5 ft", operationCategoryId: 2, maxPayloadKg: 800.0, maxVolumeCbm: 3.5, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 18.0, runningCostPerKm: 18.07, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 180000.0, extraKmRate: 75.0 },
    { id: 4, vehicleNumber: "DAE-9329", vehicleType: "8.5 ft", operationCategoryId: 2, maxPayloadKg: 800.0, maxVolumeCbm: 12.0, defaultLocationId: 153, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 18.0, runningCostPerKm: 18.07, profitPerKm: 15.0, fixedCostPerDay: 1795.36 },
    { id: 5, vehicleNumber: "GN-4557", vehicleType: "9.5 ft", operationCategoryId: 2, maxPayloadKg: 1000.0, maxVolumeCbm: 6.0, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 10.0, runningCostPerKm: 20.5, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 180000.0, extraKmRate: 75.0 },
    { id: 6, vehicleNumber: "68-3470", vehicleType: "10.5 ft", operationCategoryId: 2, maxPayloadKg: 1200.0, maxVolumeCbm: 15.0, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 10.0, runningCostPerKm: 20.5, profitPerKm: 15.0, fixedCostPerDay: 1795.36 },
    { id: 7, vehicleNumber: "GB-6111", vehicleType: "10.5 ft", operationCategoryId: 2, maxPayloadKg: 1500.0, maxVolumeCbm: 15.0, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 10.0, runningCostPerKm: 20.5, profitPerKm: 15.0, fixedCostPerDay: 1795.36 },
    { id: 8, vehicleNumber: "227-3502", vehicleType: "10.5 ft", operationCategoryId: 2, maxPayloadKg: 1500.0, maxVolumeCbm: 15.0, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 10.0, runningCostPerKm: 20.5, profitPerKm: 15.0, fixedCostPerDay: 1795.36 },
    { id: 9, vehicleNumber: "LK-6471", vehicleType: "10.5 ft", operationCategoryId: 1, maxPayloadKg: 2000.0, maxVolumeCbm: 15.0, defaultLocationId: 124, paymentBasis: "FIXED", monthlyKmLimit: 1000, fuelConsumptionKml: 10.0, runningCostPerKm: 20.5, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 314109.73, extraKmRate: 113.44 },
    { id: 10, vehicleNumber: "GE-5975", vehicleType: "14.5 ft", operationCategoryId: 2, maxPayloadKg: 2200.0, maxVolumeCbm: 18.0, defaultLocationId: 124, paymentBasis: "KM_BASED", monthlyKmLimit: 3000, fuelConsumptionKml: 8.0, runningCostPerKm: 27.02, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 180000.0, extraKmRate: 75.0 },
    { id: 15, vehicleNumber: "LM-1621", vehicleType: "14.5 ft", operationCategoryId: 2, maxPayloadKg: 2000.0, maxVolumeCbm: 20.0, defaultLocationId: 153, paymentBasis: "FIXED", monthlyKmLimit: 2500, fuelConsumptionKml: 8.0, runningCostPerKm: 27.02, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 296235.77, extraKmRate: 77.47 },
    { id: 16, vehicleNumber: "47-9845", vehicleType: "16.5 ft", operationCategoryId: 2, maxPayloadKg: 2500.0, maxVolumeCbm: 25.0, defaultLocationId: 124, paymentBasis: "FIXED", monthlyKmLimit: 1500, fuelConsumptionKml: 8.0, runningCostPerKm: 27.02, profitPerKm: 15.0, fixedCostPerDay: 1795.36, monthlyFixedRate: 331289.0, extraKmRate: 113.24 },
  ];
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { vehicleNumber: v.vehicleNumber },
      update: v,
      create: v,
    });
  }
  console.log("✅ Vehicles seeded.");

  // 11. Drivers
  const drivers = [
    { id: 1, name: "Shantha", nic: "9732608170V", mobile: "779455099", licenseNumber: "B141180", linkedVehicleId: 1 },
    { id: 2, name: "Srimal", nic: "8719147171V", mobile: "778620905", licenseNumber: "B249380", linkedVehicleId: 2 },
    { id: 3, name: "Nishantha", nic: "6681716462V", mobile: "741506556", licenseNumber: "B160851", linkedVehicleId: 3 },
    { id: 4, name: "Alwis", nic: "7819812743V", mobile: "741683037", licenseNumber: "B863246", linkedVehicleId: 4 },
    { id: 5, name: "Kumara", nic: "9732608174V", mobile: "763572716", licenseNumber: "B625288", linkedVehicleId: 5 },
    { id: 6, name: "Wijethunga", nic: "8791914715V", mobile: "772389000", licenseNumber: "B380818", linkedVehicleId: 6 },
    { id: 7, name: "Viraj", nic: "6678171646V", mobile: "740152728", licenseNumber: "B045675", linkedVehicleId: 7 },
    { id: 8, name: "Senapala", nic: "7819127477V", mobile: "774233996", licenseNumber: "B816423", linkedVehicleId: 8 },
    { id: 9, name: "Manjula", nic: "9373260818V", mobile: "762452721", licenseNumber: "B513003", linkedVehicleId: 9 },
    { id: 10, name: "Layanal", nic: "8761914719V", mobile: "741864707", licenseNumber: "B450624", linkedVehicleId: 10 },
  ];
  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { nic: d.nic },
      update: d,
      create: d,
    });
  }
  console.log("✅ Drivers seeded.");

  // 12. Standard Routes
  const sampleRoute = await prisma.route.upsert({
    where: { routeCode: "RT-STR1-HORANA" },
    update: {},
    create: {
      routeCode: "RT-STR1-HORANA",
      routeName: "STR1 Biyagama to Bodyline Horana",
      businessGroup: "ELASTIC",
      originLocationId: 124,
      totalDistanceKm: 75.5,
      routeGroup: "SOUTH",
      stops: {
        create: [
          { locationId: 124, stopSequence: 1, legDistanceKm: 0, cumulativeDistanceKm: 0 },
          { locationId: 163, stopSequence: 2, legDistanceKm: 75.5, cumulativeDistanceKm: 75.5 },
        ],
      },
    },
  });
  console.log("✅ Sample Route seeded.");

  // 13. Users & Access Scopes (Password for all seed users is Welcome123)
  // Bcrypt hash for Welcome123
  const defaultPasswordHash = "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

  const users = [
    { id: 1, userCode: "USR-0001", name: "Isuru Ranasinghe", email: "superadmin@str.com", roleId: 1, themePreference: "material" },
    { id: 2, userCode: "USR-0002", name: "Logistics Admin", email: "logistics.admin@str.com", roleId: 2, themePreference: "material" },
    { id: 3, userCode: "USR-0003", name: "Dispatcher STR (Planner)", email: "dispatcher@str.com", roleId: 3, themePreference: "material" },
    { id: 4, userCode: "USR-0004", name: "Plant Requester (STR1)", email: "requester.str1@str.com", roleId: 4, themePreference: "material" },
    { id: 5, userCode: "USR-0005", name: "Management Auditor", email: "auditor@str.com", roleId: 5, themePreference: "material" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        userCode: u.userCode,
        roleId: u.roleId,
        themePreference: u.themePreference,
      },
      create: {
        ...u,
        password: defaultPasswordHash,
      },
    });

    // Seed Plant Scoping (Admins get 1-5, Requester gets STR1=1)
    const plantIdsToAssign = u.roleId === 4 ? [1] : [1, 2, 3, 4, 5];
    for (const pId of plantIdsToAssign) {
      await prisma.userPlant.upsert({
        where: { userId_plantId: { userId: u.id, plantId: pId } },
        update: {},
        create: { userId: u.id, plantId: pId },
      });
    }

    // Seed Operation Scoping
    for (const opId of [1, 2]) {
      await prisma.userOperation.upsert({
        where: { userId_operationId: { userId: u.id, operationId: opId } },
        update: {},
        create: { userId: u.id, operationId: opId },
      });
    }
  }
  console.log("✅ Users and permissions seeded.");

  console.log("🚀 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
