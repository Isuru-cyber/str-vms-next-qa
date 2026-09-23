import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeApi, canAccessPlant } from "@/lib/permissions";
import { ActivityLogger } from "@/lib/logger";
import { generateNextRequestCode } from "@/lib/sequence";

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeApi({ action: "create_requests" });
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const {
      plantId,
      operationId,
      subOperationId,
      vehicleTypeId,
      fromLocationId,
      toLocationId,
      requiredDate,
      requiredTime,
      requiredKg,
      requiredCbm,
      boxCount,
      goodsReadyStatus,
      invoiceNumbers,
      urgency,
      itemDescription,
      remarks,
    } = body;

    if (!plantId || !operationId || !fromLocationId || !toLocationId || !requiredDate || !requiredTime || !itemDescription) {
      return NextResponse.json({ success: false, message: "Please fill in all mandatory fields." }, { status: 400 });
    }

    // Check plant access scope
    if (!canAccessPlant(user, Number(plantId))) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You are not authorized to create requests for this plant." },
        { status: 403 }
      );
    }

    // Use Sri Lanka timezone (Asia/Colombo / UTC+05:30) for accurate local day & time comparisons
    const slNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" }));
    const slYear = slNow.getFullYear();
    const slMonth = String(slNow.getMonth() + 1).padStart(2, "0");
    const slDay = String(slNow.getDate()).padStart(2, "0");
    const todayStr = `${slYear}-${slMonth}-${slDay}`;

    const parsedDate = new Date(requiredDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ success: false, message: "Invalid required date format." }, { status: 400 });
    }
    const reqDYear = parsedDate.getFullYear();
    const reqDMonth = String(parsedDate.getMonth() + 1).padStart(2, "0");
    const reqDDay = String(parsedDate.getDate()).padStart(2, "0");
    const reqDateStr = `${reqDYear}-${reqDMonth}-${reqDDay}`;

    if (reqDateStr < todayStr) {
      return NextResponse.json({ success: false, message: "Validation Error: Back-dates are not allowed. Please select today or a future date." }, { status: 400 });
    }

    // Target Time Range Validation (06:00 to 20:00)
    const [hStr, mStr] = String(requiredTime).split(":");
    const targetH = parseInt(hStr, 10);
    const targetM = parseInt(mStr || "0", 10);
    if (isNaN(targetH) || isNaN(targetM) || targetH < 6 || targetH > 20 || (targetH === 20 && targetM > 0)) {
      return NextResponse.json(
        { success: false, message: "Validation Error: Target time must be between 06:00 AM and 08:00 PM." },
        { status: 400 }
      );
    }

    // 1-Hour advance buffer check for same-day requests
    if (reqDateStr === todayStr) {
      const currentMinutes = slNow.getHours() * 60 + slNow.getMinutes();
      const targetMinutes = targetH * 60 + targetM;
      if (targetMinutes < currentMinutes + 60) {
        return NextResponse.json(
          { success: false, message: "Validation Error: Target time must be at least 1 hour ahead of current time for same-day requests." },
          { status: 400 }
        );
      }
    }

    // M-08: Validate urgency enum and item description bounds
    const ALLOWED_URGENCIES = ["Normal", "Urgent", "Critical"];
    const sanitizedUrgency = urgency && ALLOWED_URGENCIES.includes(urgency) ? urgency : "Normal";
    const sanitizedDescription = String(itemDescription).trim().slice(0, 1000);
    if (!sanitizedDescription) {
      return NextResponse.json({ success: false, message: "Item description cannot be empty." }, { status: 400 });
    }

    // Generate formatted Request Code and create request atomically within a single transaction
    const newRequest = await prisma.$transaction(async (tx: any) => {
      const requestCode = await generateNextRequestCode(tx);

      return tx.vehicleRequest.create({
        data: {
          requestCode,
          requesterId: user.id,
          plantId: Number(plantId),
          operationId: Number(operationId),
          subOperationId: subOperationId ? Number(subOperationId) : null,
          vehicleTypeId: vehicleTypeId ? Number(vehicleTypeId) : null,
          fromLocationId: Number(fromLocationId),
          toLocationId: Number(toLocationId),
          requiredDate: parsedDate,
          requiredTime: String(requiredTime),
          requiredKg: requiredKg ? Number(requiredKg) : null,
          requiredCbm: requiredCbm ? Number(requiredCbm) : null,
          boxCount: boxCount ? Number(boxCount) : null,
          goodsReadyStatus: goodsReadyStatus ? String(goodsReadyStatus) : "Ready",
          invoiceNumbers: invoiceNumbers ? String(invoiceNumbers) : null,
          urgency: sanitizedUrgency,
          itemDescription: sanitizedDescription,
          remarks: remarks ? String(remarks) : null,
          status: "SUBMITTED",
        },
      });
    });

    const requestCode = newRequest.requestCode;

    // Notify Central Fleet Dispatch
    try {
      await prisma.notification.create({
        data: {
          roleTarget: "POWER_USER",
          type: "REQUEST_CREATED",
          title: `New Request Created: ${requestCode}`,
          message: `Plant cargo request ${requestCode} submitted for ${requiredDate} ${requiredTime}.`,
          linkUrl: `/requests/${newRequest.id}`,
        },
      });
    } catch (notifErr) {
      console.warn("Failed to create dispatch notification:", notifErr);
    }

    await ActivityLogger.log("REQUEST", "CREATE", requestCode, `Created request ${requestCode}`, user.id);

    return NextResponse.json({ success: true, request: newRequest });
  } catch (err: any) {
    console.error("Create request error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to create request." }, { status: 500 });
  }
}
