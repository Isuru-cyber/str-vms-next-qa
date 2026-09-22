import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeApi({ adminOnly: true });
    if (auth.error) return auth.error;

    const { searchParams } = new URL(req.url);
    const selectedTable = searchParams.get("table") || "all";

    const wb = XLSX.utils.book_new();
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. Vehicle Requests
    if (selectedTable === "all" || selectedTable === "vehicle_requests") {
      const requests = await prisma.vehicleRequest.findMany({
        orderBy: { id: "asc" },
        include: {
          plant: true,
          operation: true,
          fromLocation: true,
          toLocation: true,
          requester: { select: { name: true, email: true } },
        },
      });

      const reqRows = requests.map((r: any) => ({
        ID: r.id,
        "Request Code": r.requestCode,
        Plant: r.plant?.code || "",
        Operation: r.operation?.name || "",
        "Requester Name": r.requester?.name || "",
        "Requester Email": r.requester?.email || "",
        "From Location": r.fromLocation?.locationName || "",
        "To Location": r.toLocation?.locationName || "",
        "Item Description": r.itemDescription,
        "Boxes Count": r.boxCount,
        "Required Weight (KG)": Number(r.requiredKg) || 0,
        "Required Volume (CBM)": Number(r.requiredCbm) || 0,
        "Required Date": r.requiredDate ? r.requiredDate.toISOString().slice(0, 10) : "",
        "Required Time": r.requiredTime,
        Urgency: r.urgency,
        "Goods Ready Status": r.goodsReadyStatus,
        "Commercial Invoices": r.invoiceNumbers || "",
        Status: r.status,
        Remarks: r.remarks || "",
        "Created At": r.createdAt.toISOString().replace("T", " ").slice(0, 19),
      }));

      const ws = XLSX.utils.json_to_sheet(reqRows);
      XLSX.utils.book_append_sheet(wb, ws, "Vehicle Requests");
    }

    // 2. Delivery Trips
    if (selectedTable === "all" || selectedTable === "delivery_trips") {
      const trips = await prisma.deliveryTrip.findMany({
        orderBy: { id: "asc" },
        include: {
          vehicle: true,
          driver: true,
          route: true,
          completedByUser: { select: { name: true, email: true } },
        },
      });

      const tripRows = trips.map((t: any) => ({
        ID: t.id,
        "Trip No": t.tripNo,
        "Vehicle No": t.vehicle?.vehicleNumber || "",
        "Vehicle Type": t.vehicle?.vehicleType || "",
        "Driver Name": t.driver?.name || "",
        "Driver Mobile": t.driver?.mobile || "",
        "Route Name": t.route?.routeName || "",
        "Planned KM": Number(t.plannedKm) || 0,
        "Actual KM": Number(t.actualKm) || 0,
        "Standard Cost": Number(t.standardCost) || 0,
        "Actual Cost": Number(t.actualCost) || 0,
        Status: t.status,
        "Completed By": t.completedByUser?.name || "",
        "Completed At": t.completedAt ? t.completedAt.toISOString().replace("T", " ").slice(0, 19) : "",
        "Admin Remarks": t.adminRemarks || "",
        "Created At": t.createdAt.toISOString().replace("T", " ").slice(0, 19),
      }));

      const ws = XLSX.utils.json_to_sheet(tripRows);
      XLSX.utils.book_append_sheet(wb, ws, "Delivery Trips");
    }

    // 3. Vehicles
    if (selectedTable === "all" || selectedTable === "vehicles") {
      const vehicles = await prisma.vehicle.findMany({
        orderBy: { id: "asc" },
        include: { defaultLocation: true, operationCategory: true },
      });

      const vehRows = vehicles.map((v: any) => ({
        ID: v.id,
        "Vehicle Number": v.vehicleNumber,
        "Vehicle Type": v.vehicleType,
        Operation: v.operationCategory?.name || "",
        "Max Payload (KG)": Number(v.maxPayloadKg) || 0,
        "Max Volume (CBM)": Number(v.maxVolumeCbm) || 0,
        "Default Location": v.defaultLocation?.locationName || "",
        "Payment Basis": v.paymentBasis,
        "Monthly KM Limit": v.monthlyKmLimit || 0,
        Status: v.status,
        Active: v.active === 1 ? "Yes" : "No",
        Remarks: v.remarks || "",
      }));

      const ws = XLSX.utils.json_to_sheet(vehRows);
      XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
    }

    // 4. Drivers
    if (selectedTable === "all" || selectedTable === "drivers") {
      const drivers = await prisma.driver.findMany({
        orderBy: { id: "asc" },
        include: { linkedVehicle: true, linkedPlant: true },
      });

      const driverRows = drivers.map((d: any) => ({
        ID: d.id,
        Name: d.name,
        NIC: d.nic,
        Mobile: d.mobile,
        "License Number": d.licenseNumber,
        "Linked Vehicle": d.linkedVehicle?.vehicleNumber || "",
        "Linked Plant": d.linkedPlant?.code || "",
        Status: d.status,
        Active: d.active === 1 ? "Yes" : "No",
        Remarks: d.remarks || "",
      }));

      const ws = XLSX.utils.json_to_sheet(driverRows);
      XLSX.utils.book_append_sheet(wb, ws, "Drivers");
    }

    // 5. Locations
    if (selectedTable === "all" || selectedTable === "locations") {
      const locations = await prisma.location.findMany({
        orderBy: { id: "asc" },
        include: { plant: true },
      });

      const locRows = locations.map((l: any) => ({
        ID: l.id,
        "Location Name": l.locationName,
        Code: l.code || "",
        Type: l.locationType,
        "Business Group": l.businessGroup || "",
        "Linked Plant": l.plant?.code || "",
        "Is Origin": l.isOrigin === 1 ? "Yes" : "No",
        Latitude: Number(l.latitude) || "",
        Longitude: Number(l.longitude) || "",
        Active: l.active === 1 ? "Yes" : "No",
      }));

      const ws = XLSX.utils.json_to_sheet(locRows);
      XLSX.utils.book_append_sheet(wb, ws, "Locations");
    }

    // 6. Routes
    if (selectedTable === "all" || selectedTable === "routes") {
      const routes = await prisma.route.findMany({
        orderBy: { id: "asc" },
        include: { originLocation: true },
      });

      const routeRows = routes.map((r: any) => ({
        ID: r.id,
        "Route Code": r.routeCode,
        "Route Name": r.routeName,
        "Business Group": r.businessGroup || "",
        "Operation Type": r.operationType || "",
        "Origin Location": r.originLocation?.locationName || "",
        "Total Distance (KM)": Number(r.totalDistanceKm) || 0,
        Active: r.active === 1 ? "Yes" : "No",
        Remarks: r.remarks || "",
      }));

      const ws = XLSX.utils.json_to_sheet(routeRows);
      XLSX.utils.book_append_sheet(wb, ws, "Routes");
    }

    // 7. Reconciliations
    if (selectedTable === "all" || selectedTable === "trip_reconciliations") {
      const recons = await prisma.tripReconciliation.findMany({
        orderBy: { id: "asc" },
        include: { trip: true },
      });

      const reconRows = recons.map((r: any) => ({
        ID: r.id,
        "Trip No": r.trip?.tripNo || "",
        "Gate Pass No": r.gatePassNo,
        "Actual Vehicle No": r.actualVehicleNo || "",
        "Customer Name": r.customerName || "",
        "Delivery Address": r.deliveryAddress || "",
        "Actual Boxes": r.actualBoxes || 0,
        "Actual KG": Number(r.actualKg) || 0,
        "Actual CBM": Number(r.actualCbm) || 0,
        "Invoice Numbers": r.invoiceNumbers || "",
        "Dispatched Date": r.dispatchedDate || "",
        "Match Status": r.matchStatus || "",
        "Variance Remarks": r.varianceRemarks || "",
        "Reconciled At": r.reconciledAt ? r.reconciledAt.toISOString().replace("T", " ").slice(0, 19) : "",
      }));

      const ws = XLSX.utils.json_to_sheet(reconRows);
      XLSX.utils.book_append_sheet(wb, ws, "Reconciliations");
    }

    // 8. Invoice PODs
    if (selectedTable === "all" || selectedTable === "invoice_pods") {
      const pods = await prisma.invoicePod.findMany({
        orderBy: { id: "asc" },
        include: { trip: true },
      });

      const podRows = pods.map((p: any) => ({
        ID: p.id,
        "Trip No": p.trip?.tripNo || "",
        "Invoice Number": p.invoiceNumber,
        "Vehicle Number": p.vehicleNumber || "",
        "Driver Name": p.driverName || "",
        "Driver Mobile": p.driverMobile || "",
        "Location Name": p.locationName || "",
        "Is Received": p.isReceived ? "Yes" : "No",
        "Received At": p.receivedAt ? p.receivedAt.toISOString().replace("T", " ").slice(0, 19) : "",
        "Received By": p.receivedByName || "",
        Remarks: p.remarks || "",
      }));

      const ws = XLSX.utils.json_to_sheet(podRows);
      XLSX.utils.book_append_sheet(wb, ws, "Proof of Delivery (POD)");
    }

    // 9. Users (WITHOUT Passwords for security!)
    if (selectedTable === "all" || selectedTable === "users") {
      const users = await prisma.user.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          userCode: true,
          name: true,
          email: true,
          active: true,
          themePreference: true,
          role: { select: { name: true, code: true } },
          createdAt: true,
        },
      });

      const userRows = users.map((u: any) => ({
        ID: u.id,
        "User Code": u.userCode || "",
        Name: u.name,
        Email: u.email,
        Role: u.role?.name || "",
        "Role Code": u.role?.code || "",
        Active: u.active === 1 ? "Active" : "Disabled",
        "Theme Preference": u.themePreference,
        "Created At": u.createdAt.toISOString().replace("T", " ").slice(0, 19),
      }));

      const ws = XLSX.utils.json_to_sheet(userRows);
      XLSX.utils.book_append_sheet(wb, ws, "Users (Sanitized)");
    }

    // 10. Plants
    if (selectedTable === "all" || selectedTable === "plants") {
      const plants = await prisma.plant.findMany({ orderBy: { id: "asc" } });
      const plantRows = plants.map((p: any) => ({
        ID: p.id,
        Code: p.code,
        Name: p.name,
        "Business Group": p.businessGroup || "",
        "Sort Order": p.sortOrder || 0,
        Active: p.active === 1 ? "Yes" : "No",
      }));
      const ws = XLSX.utils.json_to_sheet(plantRows);
      XLSX.utils.book_append_sheet(wb, ws, "Plants");
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename =
      selectedTable === "all"
        ? `str-vms-full-database-backup-${dateStr}.xlsx`
        : `str-vms-${selectedTable}-backup-${dateStr}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Excel backup export error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
