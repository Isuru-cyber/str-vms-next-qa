import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi } from "@/lib/permissions";

export async function GET() {
  try {
    const auth = await authorizeApi({ action: "manage_mail_templates" });
    if (auth.error) return auth.error;

    let templates = await prisma.mailTemplate.findMany({
      orderBy: { id: "asc" },
    });

    if (templates.length === 0) {
      const defaults = [
        {
          templateKey: "allocation_confirmed",
          name: "Vehicle Allocation Confirmation",
          description: "Email notification template sent to requesters when vehicle allocation is confirmed.",
          subject: "Vehicle Allocation Confirmed: Trip {trip_no} | {vehicle_number} - {route_name}",
          body: `Dear Requester(s),\n\nWe are pleased to inform you that your transportation request(s) have been successfully allocated and scheduled for dispatch.\n\n=======================================================\nTRIP & ALLOCATION DETAILS\n=======================================================\n• Trip Number      : {trip_no}\n• Allocation Date  : {allocation_date}\n• Assigned Route   : {route_name}\n• Trip Status      : {status}\n• Planned Distance : {planned_km} km\n\n=======================================================\nASSIGNED FLEET & DRIVER DETAILS\n=======================================================\n• Vehicle Number   : {vehicle_number} ({vehicle_type})\n• Driver Name      : {driver_name}\n• Driver NIC / ID  : {driver_nic}\n• Contact Mobile   : {driver_mobile}\n• License Number   : {driver_license}\n\n=======================================================\nALLOCATED REQUESTS BREAKDOWN\n=======================================================\n{requests_breakdown}\n\n=======================================================\nPlease ensure all gate passes, loading bays, and personnel are prepared accordingly.\nFor any inquiries or schedule updates, please contact the Logistics & Fleet Desk.\n\nBest Regards,\nLogistics & Fleet Operations Team\nSTR Vehicle Management System (VMS)`,
        },
        {
          templateKey: "dispatch_departure_notice",
          name: "Dispatch & Driver Gate-Pass Notification",
          description: "Driver and vehicle gate-pass dispatch alert for factory security & loading bays.",
          subject: "[DISPATCH & GATE PASS] Vehicle {vehicle_number} | Trip #{trip_no} ({route_name})",
          body: `GATE PASS & FLEET DISPATCH CLEARANCE NOTICE\n=======================================================\n• Trip Number   : {trip_no}\n• Route         : {route_name}\n• Departure Date: {allocation_date}\n\nFLEET & DRIVER DETAILS\n=======================================================\n• Driver Name   : {driver_name} (NIC: {driver_nic})\n• Contact Mobile: {driver_mobile}\n• Vehicle Plate : {vehicle_number} ({vehicle_type})\n\nCONSOLIDATED CARGO MANIFEST\n=======================================================\n{requests_breakdown}\n\nTotal Net Weight: {total_kg} KG | Total Volume: {total_cbm} CBM\n\nSTR Central Fleet Dispatch Management`,
        },
        {
          templateKey: "request_rejected",
          name: "Request Rejection Notice",
          description: "Dispatched when Central Fleet Dispatch rejects a vehicle request.",
          subject: "[STR VMS] Action Required: Vehicle Request {request_code} Rejected",
          body: `Dear {requester_name},\n\nPlease be informed that your Vehicle Transport Request {request_code} has been REJECTED by Central Fleet Dispatch.\n\nRequest Details:\n- Request ID: {request_code}\n- Plant: {plant_name}\n- Route: {from_location} -> {to_location}\n- Cargo / Item: {item_description}\n- Required Date: {required_date} {required_time}\n- Reason for Rejection: {rejection_reason}\n\nNext Steps:\nPlease revise your schedule or contact the Central Fleet Dispatch team if an urgent alternative arrangement is required.\n\nBest regards,\nCentral Fleet Dispatch Management\nSTR Logistics Department`,
        },
        {
          templateKey: "request_cancelled",
          name: "Request Cancellation Notice",
          description: "Dispatched when a vehicle request is cancelled by requester or plant.",
          subject: "[STR VMS] Notice: Vehicle Request {request_code} Cancelled",
          body: `Dear {requester_name},\n\nVehicle Transport Request {request_code} has been CANCELLED.\n\nRequest Details:\n- Request ID: {request_code}\n- Plant: {plant_name}\n- Route: {from_location} -> {to_location}\n- Cargo / Item: {item_description}\n- Cancellation Reason: {cancellation_reason}\n\nBest regards,\nSTR Logistics Operations`,
        },
      ];

      for (const t of defaults) {
        await prisma.mailTemplate.create({ data: t });
      }

      templates = await prisma.mailTemplate.findMany({
        orderBy: { id: "asc" },
      });
    }

    const normalizedTemplates = templates.map((t: any) => ({
      ...t,
      body: t.body
        ? t.body.replace(/\\r\\n/g, "\n").replace(/\r\n/g, "\n").replace(/\\n/g, "\n")
        : t.body,
    }));

    return NextResponse.json({ status: "success", data: normalizedTemplates });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to fetch mail templates" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "manage_mail_templates" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await request.json();
    const { id, subject, body: templateBody } = body;

    if (!id || !subject || !templateBody) {
      return NextResponse.json(
        { message: "Template ID, subject, and body are required." },
        { status: 400 }
      );
    }

    // Basic sanitization to prevent Stored XSS
    const sanitizeInput = (str: string) => {
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
    };

    const cleanSubject = sanitizeInput(String(subject).trim());
    const cleanBody = sanitizeInput(
      String(templateBody)
        .replace(/\\r\\n/g, "\n")
        .replace(/\r\n/g, "\n")
        .replace(/\\n/g, "\n")
        .trim()
    );

    const updated = await prisma.mailTemplate.update({
      where: { id: parseInt(id, 10) },
      data: {
        subject: cleanSubject,
        body: cleanBody,
      },
    });

    try {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: "UPDATE_MAIL_TEMPLATE",
          module: "SETTINGS",
          recordId: updated.id,
          newValue: JSON.stringify({ subject: cleanSubject, templateKey: updated.templateKey }),
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: `Updated email template: ${updated.name}`,
          module: "SETTINGS",
          recordId: String(updated.id),
        },
      });
    } catch (e) {
      console.error("Audit log error on template update:", e);
    }

    return NextResponse.json({
      status: "success",
      message: "Template updated successfully",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to update template" },
      { status: 500 }
    );
  }
}
