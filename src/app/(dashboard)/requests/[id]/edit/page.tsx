import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil, Lock, AlertCircle, Calendar, Clock, MapPin, Box, Scale, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isAdmin, can, canAccessPlant } from "@/lib/permissions";
import EditRequestForm from "./EditRequestForm";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestId = parseInt(id, 10);
  if (isNaN(requestId)) notFound();

  const user = await getSession();
  if (!user) redirect("/login");

  const request = await prisma.vehicleRequest.findUnique({
    where: { id: requestId },
    include: {
      plant: true,
      operation: true,
      subOperation: true,
      fromLocation: true,
      toLocation: true,
      tripRequests: {
        include: {
          trip: true,
        },
      },
    },
  });

  if (!request) notFound();

  // Authorization Check: Only owner or dispatcher/admin with plant access can edit
  if (!isAdmin(user)) {
    if (!can(user, "dispatch_trips") && request.requesterId !== user.id) {
      notFound();
    }
    if (user.plantIds && user.plantIds.length > 0 && !canAccessPlant(user, request.plantId)) {
      notFound();
    }
  }

  const isAllocated = request.tripRequests.some(
    (tr: any) => tr.trip && tr.trip.status !== "CANCELLED"
  );
  const allocatedTripNo = request.tripRequests.find(
    (tr: any) => tr.trip && tr.trip.status !== "CANCELLED"
  )?.trip?.tripNo;

  const locations = await prisma.location.findMany({
    where: { active: 1 },
    orderBy: { locationName: "asc" },
  });

  const isDispatchedOrCompleted = [
    "DISPATCHED",
    "READY_FOR_LOADING",
    "GATE_PASS_ISSUED",
    "IN_TRANSIT",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
  ].includes((request.status || "").toUpperCase());

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Breadcrumb & Header */}
      <div>
        <Link
          href={`/requests/${request.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Request Details</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Edit Transport Request
              </h1>
              <p className="text-xs text-gray-500">
                Request Code: <span className="font-bold text-indigo-600 tracking-tight">{request.requestCode}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700">
              Plant: {request.plant?.code || "N/A"}
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
              {request.subOperation?.name || request.operation?.name || "General"}
            </span>
            <span className="px-2.5 py-1.5 rounded-xl bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700">
              Status: {request.status}
            </span>
          </div>
        </div>
      </div>

      {isDispatchedOrCompleted ? (
        <div className="p-6 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-start gap-4 text-xs shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-lg shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-rose-950 text-sm">
              Modification Locked &bull; Status: {request.status}
            </h4>
            <p className="text-rose-800 leading-relaxed text-xs">
              This transport request has already been dispatched to the loading bay or finalized ({request.status}). No modifications can be made by entry users.
            </p>
            <div className="pt-3">
              <Link
                href={`/requests/${request.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition"
              >
                Return to Request Details
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isAllocated && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 text-xs shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-xs">
                  Request Allocated to Trip {allocatedTripNo}
                </h4>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  This request has been assigned to an active delivery trip. You can modify <b>Box Count</b>, <b>Gross Weight (KG)</b>, <b>Volume (CBM)</b>, <b>Invoice Numbers</b>, and <b>Remarks</b> until dispatch. Corridor routing and schedule are locked.
                </p>
              </div>
            </div>
          )}

          {/* Edit Form Component */}
          <EditRequestForm
            request={JSON.parse(JSON.stringify(request))}
            locations={JSON.parse(JSON.stringify(locations))}
            isAllocated={isAllocated}
          />
        </>
      )}
    </div>
  );
}
