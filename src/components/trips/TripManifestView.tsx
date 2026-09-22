"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Truck,
  User,
  MapPin,
  Calendar,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileCheck2,
  DollarSign,
  Fuel,
  Mail,
  Copy,
  Check,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatNumber, formatCurrency } from "@/lib/utils";

interface TripManifestProps {
  trip: any;
}

export const TripManifestView: React.FC<TripManifestProps> = ({ trip }) => {
  const router = useRouter();

  const [outlookModalOpen, setOutlookModalOpen] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [copySubjectSuccess, setCopySubjectSuccess] = useState(false);
  const [copyBodySuccess, setCopyBodySuccess] = useState(false);
  const [mailTemplates, setMailTemplates] = useState<any[]>([]);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState("allocation_confirmed");

  const handlePrint = () => {
    window.print();
  };

  const requests = trip.tripRequests || [];
  const totalBoxes = requests.reduce(
    (sum: number, tr: any) => sum + (Number(tr.request?.boxCount) || 0),
    0
  );
  const totalWeight = requests.reduce(
    (sum: number, tr: any) => sum + (Number(tr.request?.requiredKg) || 0),
    0
  );
  const totalCbm = requests.reduce(
    (sum: number, tr: any) => sum + (Number(tr.request?.requiredCbm) || 0),
    0
  );

  const getLoadingSequenceLabel = (idx: number, total: number) => {
    if (total === 1) return "1st & Door Loading";
    if (idx === total - 1) return "Door Loading (First Offloaded)";
    if (idx === 0) return "1st Loading (Deepest In Bay)";
    return `${idx + 1}th Loading Sequence`;
  };

  useEffect(() => {
    fetch("/api/settings/mail-templates")
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (resData?.data && Array.isArray(resData.data) && resData.data.length > 0) {
          setMailTemplates(resData.data);
        }
      })
      .catch(() => {});
  }, []);

  const requestsList = (trip.tripRequests || []).map((tr: any) => tr.request).filter(Boolean);

  const compileMail = (tKey: string) => {
    const defaultTemplate = {
      templateKey: "allocation_confirmed",
      name: "Vehicle Allocation Confirmation",
      subject: "Vehicle Allocation Confirmed: Trip {trip_no} | {vehicle_number} - {route_name}",
      body: `Dear Requester(s),\n\nWe are pleased to inform you that your transportation request(s) have been successfully allocated and scheduled for dispatch.\n\n=======================================================\nTRIP & ALLOCATION DETAILS\n=======================================================\n• Trip Number      : {trip_no}\n• Allocation Date  : {allocation_date}\n• Assigned Route   : {route_name}\n• Trip Status      : {status}\n• Planned Distance : {planned_km} km\n\n=======================================================\nASSIGNED FLEET & DRIVER DETAILS\n=======================================================\n• Vehicle Number   : {vehicle_number} ({vehicle_type})\n• Driver Name      : {driver_name}\n• Driver NIC / ID  : {driver_nic}\n• Contact Mobile   : {driver_mobile}\n• License Number   : {driver_license}\n\n=======================================================\nALLOCATED REQUESTS BREAKDOWN\n=======================================================\n{requests_breakdown}\n\n=======================================================\nPlease ensure all gate passes, loading bays, and personnel are prepared accordingly.\nFor any inquiries or schedule updates, please contact the Logistics & Fleet Desk.\n\nBest Regards,\nLogistics & Fleet Operations Team\nSTR Vehicle Management System (VMS)`,
    };

    const tpl = mailTemplates.find((t) => t.templateKey === tKey) || defaultTemplate;

    const breakdownText = requestsList
      .map((r: any, i: number) => {
        let loadingLabel = `${i + 1}th Loading`;
        if (requestsList.length > 1 && i === requestsList.length - 1) {
          loadingLabel = "Door Loading";
        } else if (i === 0) {
          loadingLabel = "1st Loading";
        } else if (i === 1) {
          loadingLabel = "2nd Loading";
        } else if (i === 2) {
          loadingLabel = "3rd Loading";
        }

        const rawInvoices = (r.invoiceNumbers || "").trim();
        const invoiceText = rawInvoices
          ? rawInvoices.split(/[\r\n,]+/).map((s: string) => s.trim()).filter(Boolean).join(", ")
          : "Pending";

        const custCode = (r.customerCode || r.toLocation?.code || "").trim() || "-";
        const origin = r.fromLocation?.locationName || r.fromName || r.plant?.name || r.plant?.code || "-";
        const dest = r.toLocation?.locationName || r.toName || "-";
        const subOp = r.subOperation?.name || r.sub_operation_name || "Finished Goods";
        const cbm = Number(r.requiredCbm || 0).toFixed(2);
        const kg = Math.round(Number(r.requiredKg || 0)).toLocaleString();
        const reqName = r.requester?.name || "Requester";
        const reqEmail = r.requester?.email ? ` (${r.requester.email})` : "";
        const reqPerson = `${reqName}${reqEmail}`;

        return [
          `${i + 1}) [${loadingLabel}] Request ID: ${r.requestCode || `REQ-${r.id}`}`,
          `   • Customer Code     : ${custCode}`,
          `   • Invoice No(s)     : ${invoiceText}`,
          `   • Route / Locations : ${origin} -> ${dest}`,
          `   • Sub-Operation     : ${subOp}`,
          `   • Cargo Details     : ${cbm} CBM | ${kg} KG`,
          `   • Requested By      : ${reqPerson}`,
        ].join("\n");
      })
      .join("\n\n");

    const placeholders: Record<string, string> = {
      trip_no: trip.tripNo || "TRIP-NEW",
      allocation_date: trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : new Date().toLocaleDateString(),
      route_name: trip.route?.routeName || "Combined Fleet Route",
      status: trip.status || "ALLOCATED",
      planned_km: String(trip.plannedKm || 0),
      vehicle_number: trip.vehicle?.vehicleNumber || "Unassigned",
      vehicle_type: trip.vehicle?.vehicleType || "Standard Fleet",
      driver_name: trip.driver?.name || "Assigned Driver",
      driver_nic: trip.driver?.nic || "N/A",
      driver_mobile: trip.driver?.mobile || "N/A",
      driver_license: trip.driver?.licenseNumber || trip.driver?.license || "N/A",
      total_cbm: totalCbm.toFixed(2),
      total_kg: Math.round(totalWeight).toLocaleString(),
      requests_breakdown: breakdownText || "No requests linked yet",
      plant_name: requestsList[0]?.plant?.name || requestsList[0]?.plantCode || "STR Plant",
      from_location: requestsList[0]?.fromLocation?.locationName || "STR Plant Origin",
      to_location: requestsList[requestsList.length - 1]?.toLocation?.locationName || "Warehouse Destination",
      item_description: requestsList.map((r: any) => r.itemDescription).filter(Boolean).join(", ") || "General Finished Goods",
      required_date: requestsList[0]?.requiredDate ? new Date(requestsList[0].requiredDate).toLocaleDateString() : "-",
      required_time: requestsList[0]?.requiredTime || "-",
      requester_name: requestsList[0]?.requester?.name || "Plant Logistics Requester",
      rejection_reason: "Schedule conflict / fleet reallocation required",
      cancellation_reason: "Consolidated into alternate route",
    };

    let subj = tpl.subject || "";
    let body = tpl.body || "";
    for (const [k, v] of Object.entries(placeholders)) {
      const re = new RegExp(`\\{${k}\\}`, "g");
      subj = subj.replace(re, v);
      body = body.replace(re, v);
    }
    return { subject: subj, body };
  };

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-16 px-2 sm:px-4 print:max-w-none print:p-0 print:m-0">
      {/* Action Bar */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-3">
          <Link
            href="/trips"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900 tracking-tight">
              Trip Details: {trip.tripNo}
            </h1>
            <StatusBadge status={trip.status} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {trip.status === "ASSIGNED" && (
            <Link
              href="/allocations/fg/combine"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Combine Workbench</span>
            </Link>
          )}

          {["COMPLETED", "RECONCILED", "DISPATCHED", "IN_TRANSIT", "READY_FOR_LOADING"].includes(trip.status) && (
            <Link
              href="/reconciliation"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Datatex Reconciliation</span>
            </Link>
          )}

          {["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(trip.status) && (
            <Link
              href="/pod"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>POD Hub</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              const compiled = compileMail(selectedTemplateKey);
              setDraftSubject(compiled.subject);
              setDraftBody(compiled.body);
              setOutlookModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
            title="Draft Outlook email to requesters"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Draft Outlook Email</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Optional print for filing"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE SLIP CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 sm:p-8 space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Printable Header */}
        <div className="flex items-start justify-between border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                STR
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 uppercase tracking-wide">
                  South Asia Textiles Industries - Logistics VMS
                </h2>
                <p className="text-xs text-gray-500">
                  Factory Dispatch Slip & Vehicle Delivery Manifest
                </p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="font-bold text-base text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg tracking-tight">
              {trip.tripNo}
            </span>
            <p className="text-[11px] text-gray-500 mt-1.5 tabular-nums">
              Date: {new Date(trip.createdAt).toLocaleDateString()} {new Date(trip.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Vehicle, Driver & Route Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Vehicle Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold uppercase text-[10px] tracking-wider">
              <Truck className="w-3.5 h-3.5" />
              <span>Assigned Vehicle</span>
            </div>
            <p className="font-bold text-sm text-gray-900 tracking-tight">
              {trip.vehicle?.vehicleNumber || "Unassigned"}
            </p>
            <div className="space-y-0.5 text-gray-600 text-[11px]">
              <p>Type: <strong className="text-gray-800">{trip.vehicle?.vehicleType}</strong></p>
              <p>Max Payload: <strong className="text-gray-800 tabular-nums">{trip.vehicle?.maxPayloadKg || "-"} kg</strong></p>
              <p>Basis: <strong className="text-gray-800">{trip.paymentBasis || trip.vehicle?.paymentBasis || "KM-Based"}</strong></p>
            </div>
          </div>

          {/* Driver Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold uppercase text-[10px] tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Authorized Driver</span>
            </div>
            <p className="font-bold text-sm text-gray-900">
              {trip.driver?.name || "Unassigned"}
            </p>
            <div className="space-y-0.5 text-gray-600 text-[11px] tabular-nums">
              <p>Mobile: <strong className="text-gray-800">{trip.driver?.mobile || "-"}</strong></p>
              <p>NIC: <strong className="text-gray-800">{trip.driver?.nic || "-"}</strong></p>
              <p>License: <strong className="text-gray-800">{trip.driver?.licenseNumber || "-"}</strong></p>
            </div>
          </div>

          {/* Route & Distance Card */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-600 font-bold uppercase text-[10px] tracking-wider">
              <MapPin className="w-3.5 h-3.5" />
              <span>Route & Distance</span>
            </div>
            <p className="font-bold text-sm text-gray-900 leading-snug break-words">
              {trip.route?.routeName || "Multi-Stop Dispatch Corridor"}
            </p>
            <div className="space-y-0.5 text-gray-600 text-[11px] tabular-nums">
              <p>Planned Distance: <strong className="text-gray-900">{formatNumber(Number(trip.plannedKm) || 0, 1)} KM</strong></p>
              {trip.actualKm && <p>Actual Distance: <strong className="text-emerald-700">{formatNumber(Number(trip.actualKm), 1)} KM</strong></p>}
              <p>Origin Plant: <strong className="text-gray-800">{trip.route?.originLocation?.locationName || "STR 1 - BIYAGAMA"}</strong></p>
            </div>
          </div>
        </div>

        {/* Cargo Loading Sequence Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Multi-Drop Cargo Manifests ({requests.length} Requests)</span>
            </h3>
            <span className="text-[11px] text-gray-500">
              Sequence sorted by loading order (Door to Deep)
            </span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Order</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Request Code</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Plant</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Pickup & Destination</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Commercial Invoices</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Boxes</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Weight (KG)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">CBM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-400">
                      No cargo requests currently linked to this trip.
                    </td>
                  </tr>
                ) : (
                  requests.map((tr: any, idx: number) => {
                    const r = tr.request;
                    return (
                      <tr key={tr.requestId || idx} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] tabular-nums">
                            {tr.loadingSequence || idx + 1}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-indigo-700 tracking-tight whitespace-nowrap">
                          {r?.requestCode}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">
                          {r?.plant?.code || "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-gray-500">{r?.fromLocation?.locationName}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="font-semibold text-gray-900">{r?.toLocation?.locationName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-700 text-xs tabular-nums max-w-[200px] lg:max-w-[260px]">
                          <div
                            className="truncate whitespace-nowrap overflow-hidden text-ellipsis cursor-help"
                            title={r?.invoiceNumbers || "-"}
                          >
                            {r?.invoiceNumbers || "-"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {r?.boxCount || 0}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {formatNumber(Number(r?.requiredKg) || 0, 1)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {formatNumber(Number(r?.requiredCbm) || 0, 2)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                <tr>
                  <td colSpan={5} className="py-2.5 px-3 text-right text-gray-700 uppercase text-[10px]">
                    Total Dispatch Volume:
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-900 tabular-nums">{totalBoxes}</td>
                  <td className="py-2.5 px-3 text-right text-gray-900 tabular-nums">{formatNumber(totalWeight, 1)} kg</td>
                  <td className="py-2.5 px-3 text-right text-gray-900 tabular-nums">{formatNumber(totalCbm, 2)} cbm</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Commercial Invoices & Datatex Reconciliations */}
        {(() => {
          const invoiceList: string[] = [];
          trip.tripRequests?.forEach((tr: any) => {
            if (tr.request?.invoiceNumbers) {
              tr.request.invoiceNumbers
                .split(/[\r\n,;]+/)
                .map((s: string) => s.trim())
                .filter(Boolean)
                .forEach((inv: string) => {
                  if (!invoiceList.includes(inv)) invoiceList.push(inv);
                });
            }
          });
          const hasInvoices = invoiceList.length > 0;
          const hasGatePasses = trip.gatePasses?.length > 0;
          const hasRecs = trip.reconciliations?.length > 0;

          if (!hasInvoices && !hasGatePasses && !hasRecs) return null;

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Commercial Invoices */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Commercial Invoices</span>
                </h4>
                <div className="space-y-1 text-xs">
                  {hasInvoices ? (
                    invoiceList.map((inv, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                        <span className="font-bold text-gray-900 tracking-tight">{inv}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Invoice
                        </span>
                      </div>
                    ))
                  ) : (
                    trip.gatePasses?.map((gp: any) => (
                      <div key={gp.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100">
                        <span className="font-bold text-gray-900 tracking-tight">{gp.gatePassNo}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {gp.status || "ENTERED"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reconciliation */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Datatex ERP Reconciliation</span>
                </h4>
                {trip.reconciliations?.length > 0 ? (
                  <div className="p-2.5 rounded-lg bg-white border border-gray-100 text-xs space-y-1 tabular-nums">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Status:</span>
                      <strong className="font-sans">{trip.reconciliations[0].matchStatus}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Verified Boxes:</span>
                      <span>{trip.reconciliations[0].actualBoxes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans">Verified Weight:</span>
                      <span>{formatNumber(Number(trip.reconciliations[0].actualKg), 1)} kg</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic p-2">Pending Datatex ERP reconciliation upload.</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Operational Footer Banner */}
        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Digital Trip Record &bull; South Asia Textiles Logistics Management System</span>
          </div>
          <p className="tabular-nums">
            Generated on {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* MODAL: Outlook Email Draft Modal */}
      {outlookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Outlook Email Notification</h3>
                  <p className="text-xs text-slate-400 font-medium">Preview, select template, and format email draft</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOutlookModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Template:</span>
              </label>
              <select
                value={selectedTemplateKey}
                onChange={(e) => {
                  setSelectedTemplateKey(e.target.value);
                  const compiled = compileMail(e.target.value);
                  setDraftSubject(compiled.subject);
                  setDraftBody(compiled.body);
                }}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {(mailTemplates.length > 0 ? mailTemplates : [{ templateKey: "allocation_confirmed", name: "Vehicle Allocation Confirmation" }]).map((tpl: any) => (
                  <option key={tpl.templateKey} value={tpl.templateKey}>
                    {tpl.name} ({tpl.templateKey})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* To field */}
              <div>
                <label className="block text-slate-600 font-bold mb-1">To (Requesters / Dispatch Desk):</label>
                <input
                  type="text"
                  readOnly
                  value={
                    Array.from(
                      new Set(
                        requestsList
                          .map((r: any) => r.requester?.email)
                          .filter(Boolean)
                      )
                    ).join("; ") || "logistics@str.com"
                  }
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold tabular-nums"
                />
              </div>

              {/* Subject field */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-600 font-bold">Subject Line:</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(draftSubject);
                        setCopySubjectSuccess(true);
                        setTimeout(() => setCopySubjectSuccess(false), 2000);
                      }
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    {copySubjectSuccess ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Subject</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Body textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-600 font-bold">Email Body (11pt Outlook Standard):</label>
                  <button
                    type="button"
                    onClick={() => {
                      const htmlFormatted = `<div style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${draftBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
                      if (typeof navigator !== "undefined" && navigator.clipboard && window.ClipboardItem) {
                        const textBlob = new Blob([draftBody], { type: "text/plain" });
                        const htmlBlob = new Blob([htmlFormatted], { type: "text/html" });
                        navigator.clipboard
                          .write([
                            new ClipboardItem({
                              "text/plain": textBlob,
                              "text/html": htmlBlob,
                            }),
                          ])
                          .then(() => {
                            setCopyBodySuccess(true);
                            setTimeout(() => setCopyBodySuccess(false), 2000);
                          })
                          .catch(() => {
                            navigator.clipboard.writeText(draftBody);
                            setCopyBodySuccess(true);
                            setTimeout(() => setCopyBodySuccess(false), 2000);
                          });
                      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                        navigator.clipboard.writeText(draftBody);
                        setCopyBodySuccess(true);
                        setTimeout(() => setCopyBodySuccess(false), 2000);
                      }
                    }}
                    className={`text-[11px] font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      copyBodySuccess
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                        : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    {copyBodySuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied (11pt Calibri)!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Body (11pt Formatted)</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={10}
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  className="w-full text-xs font-sans bg-white border border-slate-300 rounded-xl p-3 text-slate-800 leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOutlookModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
              >
                Close
              </button>
              <a
                href={`mailto:${
                  Array.from(new Set(requestsList.map((r: any) => r.requester?.email).filter(Boolean))).join(";") || "logistics@str.com"
                }?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftBody)}`}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open in Outlook / Mail Client</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
