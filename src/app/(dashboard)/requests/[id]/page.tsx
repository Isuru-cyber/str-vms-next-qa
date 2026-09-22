import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  Building2,
  Calendar,
  Clock,
  Scale,
  Box,
  Layers,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Receipt,
  ExternalLink,
  Flame,
  Info,
  ShieldCheck,
  Hash,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDispatcher, isRequester, can, isAdmin, canAccessPlant } from "@/lib/permissions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RequestActionButtons } from "@/components/requests/RequestActionButtons";

function formatNumber(val: any, decimals = 2): string {
  if (val == null || val === "") return "-";
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) notFound();

  const user = await getSession();

  let request: any = null;
  try {
    const rawRequest = await prisma.vehicleRequest.findUnique({
      where: { id: requestId },
      include: {
        plant: true,
        operation: true,
        subOperation: true,
        vehicleType: true,
        fromLocation: true,
        toLocation: true,
        route: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            userCode: true,
            role: true,
          },
        },
        tripRequests: {
          include: {
            trip: {
              include: {
                vehicle: true,
                driver: true,
                route: true,
              },
            },
          },
        },
      },
    });
    if (rawRequest) {
      request = JSON.parse(JSON.stringify(rawRequest));
    }
  } catch (err) {
    console.error("Failed to fetch request details:", err);
    request = null;
  }

  // Strictly throw 404 if request not found in database
  if (!request) {
    notFound();
  }

  if (!user) {
    redirect("/login");
  }

  // Authorization Check (Prevent IDOR across plants and users)
  if (!isAdmin(user)) {
    if (!can(user, "dispatch_trips") && !can(user, "allocate_trips") && request.requesterId !== user.id) {
      notFound();
    }
    if (user.plantIds && user.plantIds.length > 0 && !canAccessPlant(user, request.plantId)) {
      notFound();
    }
  }

  const assignedTrip = request.tripRequests?.[0]?.trip;
  const isAllocated = !!assignedTrip && !["CANCELLED", "COMPLETED"].includes(assignedTrip.status);
  const canAllocate = Boolean(
    user && (isDispatcher(user) || can(user, "allocate_trips")) && !isRequester(user)
  );

  // Parse invoice numbers into discrete chips
  const invoices = request.invoiceNumbers
    ? request.invoiceNumbers
        .split(/[\r\n,]+/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];

  const requesterRole =
    typeof request.requester?.role === "string"
      ? request.requester.role
      : request.requester?.role?.name || request.requester?.role?.code || "";

  const formattedDate = request.requiredDate
    ? new Date(request.requiredDate).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "-";

  const formattedCreated = request.createdAt
    ? new Date(request.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <div className="max-w-[1550px] mx-auto space-y-4 pb-12 w-full px-2 sm:px-4">
      {/* Top Breadcrumbs & Reference Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/requests"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-2xs group cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Requests Register</span>
        </Link>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span>System Record:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 text-xs tracking-tight tabular-nums">
            ID #{request.id}
          </span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Request Identity */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                  {request.requestCode}
                </h1>

                <StatusBadge status={request.status} />

                {request.urgency && request.urgency !== "Normal" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase tracking-wide">
                    <Flame className="w-3 h-3 text-rose-500 fill-rose-500" />
                    <span>{request.urgency}</span>
                  </span>
                )}

                {request.requestType && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {request.requestType}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <span>
                  Submitted on <strong className="text-slate-700">{formattedCreated}</strong>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span>
                  Plant: <strong className="text-slate-700">{request.plant?.name || request.plant?.code}</strong>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span>
                  Operation: <strong className="text-indigo-600">{request.operation?.name}</strong>
                  {request.subOperation?.name ? ` (${request.subOperation.name})` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Executive Action Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {canAllocate && ["SUBMITTED", "UNDER REVIEW", "DRAFT"].includes(request.status) && (
              <Link
                href="/allocations/fg"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Allocate Vehicle</span>
              </Link>
            )}

            <RequestActionButtons
              requestId={request.id}
              requestCode={request.requestCode}
              status={request.status}
              isAllocated={isAllocated}
              userRole={user?.roleCode}
              currentUserId={user?.id}
              requesterId={request.requesterId}
            />
          </div>
        </div>
      </div>

      {/* Request Completed / Finalized / Closed Audit Lock Notice */}
      {["COMPLETED", "FINALIZED", "CLOSED"].includes(request.status) && (
        <div className="bg-slate-50 border border-slate-300 rounded-xl p-3.5 sm:p-4 shadow-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs text-slate-700">
            <span className="font-bold text-slate-900">
              🔒 Request Locked ({request.status}):
            </span>{" "}
            This request has concluded its logistics lifecycle. All cargo specifications and dispatch records are sealed for audit compliance.
          </div>
        </div>
      )}

      {/* Allocated Trip Hero Banner (If Vehicle is Allocated) */}
      {isAllocated && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/60 to-white border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">
                  Allocated Trip: <span className="font-bold text-blue-700 tracking-tight">{assignedTrip.tripNo}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                  {assignedTrip.status || "ASSIGNED"}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Assigned Vehicle:{" "}
                <strong className="text-slate-900 font-bold tracking-tight">
                  {assignedTrip.vehicle?.vehicleNumber || "N/A"}
                </strong>
                {assignedTrip.vehicle?.vehicleType ? ` (${assignedTrip.vehicle.vehicleType})` : ""} &bull; Driver:{" "}
                <strong className="text-slate-900">{assignedTrip.driver?.name || "N/A"}</strong>
                {assignedTrip.driver?.mobile ? ` (${assignedTrip.driver.mobile})` : ""}
              </p>
            </div>
          </div>

          {canAllocate && (
            <Link
              href={`/allocations/fg/combine/${assignedTrip.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 self-start md:self-auto cursor-pointer"
            >
              <span>Open Combine Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Main Details Grid: 7 Cols Left / 5 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* LEFT COLUMN (7 Cols): Transit Route & Cargo Particulars */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card 1: Transit Corridor & Facility Locations */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Transit Corridor &amp; Facility Locations</span>
              </h2>
              {request.route && (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 tracking-tight">
                  {request.route.routeCode || "STANDARD"}
                </span>
              )}
            </div>

            {/* Visual Origin -> Destination Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
              {/* Origin Facility */}
              <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Pickup Origin Location
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded tracking-tight">
                    {request.plant?.code || "STR"} FACILITY
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {request.fromLocation?.locationName || "-"}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{request.fromLocation?.locationType || "Origin Facility"}</span>
                </p>
                {request.fromLocation?.address && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {request.fromLocation.address}
                  </p>
                )}
              </div>

              {/* Destination Facility */}
              <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 space-y-1.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Delivery Destination
                  </span>
                  {request.customerCode && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded tracking-tight">
                      CUST: {request.customerCode}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-tight">
                  {request.toLocation?.locationName || "-"}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{request.toLocation?.locationType || "Direct factory bay clearance"}</span>
                </p>
                {request.toLocation?.address && (
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {request.toLocation.address}
                  </p>
                )}
              </div>
            </div>

            {/* Contact Person details if available */}
            {(request.contactPerson || request.contactPhone) && (
              <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center gap-2.5 text-xs text-blue-900">
                <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>
                  Site Contact: <strong>{request.contactPerson || "Officer In-charge"}</strong>
                  {request.contactPhone ? ` &bull; ${request.contactPhone}` : ""}
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Cargo Specifications & Loading Metrics */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Cargo Particulars &amp; Loading Metrics</span>
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">
                Unit Measurements: Metric
              </span>
            </div>

            {/* 4-Box Executive KPI Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Gross Weight */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Gross Weight</span>
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-1 pt-0.5">
                  <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {formatNumber(request.requiredKg, 2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">kg</span>
                </div>
                <span className="text-xs text-slate-400 block">Total Tare &amp; Net</span>
              </div>

              {/* Total Volume */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Total Volume</span>
                  <Box className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-1 pt-0.5">
                  <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {formatNumber(request.requiredCbm, 2)}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">cbm</span>
                </div>
                <span className="text-xs text-slate-400 block">Calculated Cube</span>
              </div>

              {/* Box / Cartons */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Box / Cartons</span>
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="flex items-baseline gap-1 pt-0.5">
                  <span className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {request.boxCount ?? "-"}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase">bxs</span>
                </div>
                <span className="text-xs text-slate-400 block">Package Units</span>
              </div>

              {/* Vehicle / Division */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Fleet Spec</span>
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="pt-0.5">
                  <span className="text-sm sm:text-base font-bold text-slate-900 block truncate" title={request.vehicleType?.name || "Standard Fleet"}>
                    {request.vehicleType?.name || "Standard Fleet"}
                  </span>
                </div>
                <span className="text-xs text-indigo-600 font-semibold block truncate">
                  {request.subOperation?.name || "Finished Goods"}
                </span>
              </div>
            </div>

            {/* Item Description Callout */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Item Description &amp; Cargo Content</span>
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium leading-relaxed">
                {request.itemDescription || "No item description provided."}
              </div>
            </div>

            {/* Commercial Invoices */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-slate-400" />
                  <span>Commercial Invoices &amp; Gate Documentation</span>
                </span>
                {invoices.length > 0 && (
                  <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    {invoices.length} Document{invoices.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {invoices.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {invoices.map((inv: string, idx: number) => (
                    <span
                      key={idx}
                      className="font-bold text-xs text-blue-900 bg-blue-50/60 border border-blue-200 px-3 py-1 rounded-lg shadow-2xs tracking-tight"
                    >
                      {inv}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No commercial invoices specified.</p>
              )}
            </div>

            {/* Handling Remarks */}
            {request.remarks && (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Handling Remarks &amp; Gate Instructions</span>
                </span>
                <p className="text-xs text-amber-900 font-medium pt-0.5 leading-relaxed">
                  {request.remarks}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Schedule, Requester & Trip Assignment */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 3: Schedule & Dispatch Timing */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Schedule &amp; Dispatch Timing</span>
              </h3>
              {request.goodsReadyStatus && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ready: {request.goodsReadyStatus}
                </span>
              )}
            </div>

            {/* Date & Time Presentation */}
            <div className="p-3.5 rounded-lg bg-slate-50/80 border border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-blue-700 shadow-2xs shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Required Dispatch Date
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                    {formattedDate}
                  </p>
                </div>
              </div>

              <div className="text-right border-l border-slate-200 pl-3.5 shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Departure Time
                </span>
                <p className="text-xs sm:text-sm font-bold text-indigo-700 mt-0.5 flex items-center justify-end gap-1 tabular-nums">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{request.requiredTime || "08:00"}</span>
                </p>
              </div>
            </div>

            {/* Requester Identity Box */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider block">
                Requester Identity &amp; Authorization
              </span>
              <div className="p-3 rounded-lg bg-slate-50/80 border border-slate-200/80 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
                  {request.requester?.name ? request.requester.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {request.requester?.name || "Plant Requester"}
                    </p>
                    {requesterRole && (
                      <span className="text-[9.5px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                        {requesterRole}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {request.requester?.email || "No email available"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Fleet & Vehicle Allocation Status */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Fleet &amp; Trip Assignment</span>
            </h3>

            {isAllocated ? (
              <div className="space-y-2.5">
                <div className="p-3.5 rounded-lg bg-blue-50/80 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-bold text-blue-900 tracking-tight">
                      {assignedTrip.tripNo}
                    </span>
                    <StatusBadge status={assignedTrip.status} />
                  </div>

                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-blue-100">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vehicle Plate:</span>
                      <strong className="text-slate-900 font-bold tracking-tight">
                        {assignedTrip.vehicle?.vehicleNumber || "N/A"}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vehicle Spec:</span>
                      <span className="font-medium text-slate-800">
                        {assignedTrip.vehicle?.vehicleType || "Fleet Vehicle"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned Driver:</span>
                      <span className="font-medium text-slate-800">
                        {assignedTrip.driver?.name || "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Route ID:</span>
                      <span
                        className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs tracking-tight cursor-help truncate max-w-[200px]"
                        title={assignedTrip.route?.routeName || "Direct Corridor"}
                      >
                        {assignedTrip.route?.routeCode || "RTE-DIRECT"}
                      </span>
                    </div>
                    {assignedTrip.plannedKm && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Planned Distance:</span>
                        <strong className="text-slate-900 font-bold tabular-nums">
                          {formatNumber(assignedTrip.plannedKm, 1)} KM
                        </strong>
                      </div>
                    )}
                  </div>
                </div>

                {canAllocate && (
                  <Link
                    href={`/allocations/fg/combine/${assignedTrip.id}`}
                    className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Open Allocation Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Awaiting Vehicle Allocation
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed max-w-xs mx-auto">
                    This delivery request is queued for vehicle assignment or multi-destination combine trip.
                  </p>
                </div>

                {canAllocate && ["SUBMITTED", "UNDER REVIEW", "DRAFT"].includes(request.status) && (
                  <Link
                    href="/allocations/fg"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Allocate Vehicle Now</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}