'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Calendar,
  Clock,
  AlertTriangle,
  Scale,
  Box,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react';

interface EditRequestFormProps {
  request: any;
  locations: any[];
  isAllocated: boolean;
}

export default function EditRequestForm({
  request,
  locations,
  isAllocated,
}: EditRequestFormProps) {
  const router = useRouter();

  const formattedInitialDate = request.requiredDate
    ? new Date(request.requiredDate).toISOString().split('T')[0]
    : '';

  const [fromLocationId, setFromLocationId] = useState(
    String(request.fromLocationId || '')
  );
  const [toLocationId, setToLocationId] = useState(
    String(request.toLocationId || '')
  );
  const [requiredDate, setRequiredDate] = useState(formattedInitialDate);
  const [requiredTime, setRequiredTime] = useState(request.requiredTime || '08:00');
  const [urgency, setUrgency] = useState(request.urgency || 'Normal');
  const [requiredKg, setRequiredKg] = useState(String(request.requiredKg ?? 0));
  const [requiredCbm, setRequiredCbm] = useState(String(request.requiredCbm ?? 0));
  const [boxCount, setBoxCount] = useState(String(request.boxCount ?? 0));
  const [goodsReadyStatus, setGoodsReadyStatus] = useState(
    request.goodsReadyStatus || 'Ready for Loading'
  );
  const [invoiceNumbers, setInvoiceNumbers] = useState(
    (request.invoiceNumbers || '').replace(/,\s*/g, '\n')
  );
  const [itemDescription, setItemDescription] = useState(
    request.itemDescription || ''
  );
  const [remarks, setRemarks] = useState(request.remarks || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const isSelectedDateToday = requiredDate === todayStr;
  const currentHour = new Date().getHours();

  // Categorized Locations for Dropdowns (Plants, Warehouses, Customers, Internal/Other)
  const categorizedLocations = useMemo(() => {
    const plantsList = locations
      .filter((l: any) => l.locationType === "PLANT")
      .sort((a: any, b: any) => a.locationName.localeCompare(b.locationName));
    const warehousesList = locations
      .filter((l: any) => l.locationType === "WAREHOUSE")
      .sort((a: any, b: any) => a.locationName.localeCompare(b.locationName));
    const customersList = locations
      .filter((l: any) => l.locationType === "CUSTOMER")
      .sort((a: any, b: any) => a.locationName.localeCompare(b.locationName));
    const othersList = locations
      .filter((l: any) => !["PLANT", "WAREHOUSE", "CUSTOMER"].includes(l.locationType))
      .sort((a: any, b: any) => a.locationName.localeCompare(b.locationName));

    return {
      plants: plantsList,
      warehouses: warehousesList,
      customers: customersList,
      others: othersList,
    };
  }, [locations]);

  // Parse invoices count
  const invoiceList = invoiceNumbers
    .split('\n')
    .map((s: string) => s.trim())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    if (!isAllocated) {
      const [hourStr, minStr] = requiredTime.split(':');
      const targetH = parseInt(hourStr, 10);
      const targetM = parseInt(minStr || '0', 10);

      if (isNaN(targetH) || isNaN(targetM) || targetH < 6 || targetH > 20 || (targetH === 20 && targetM > 0)) {
        setErrorMsg('Target time must be between 06:00 AM and 08:00 PM.');
        setIsSubmitting(false);
        return;
      }

      if (isSelectedDateToday) {
        const currentTotalMins = new Date().getHours() * 60 + new Date().getMinutes();
        if (targetH * 60 + targetM < currentTotalMins + 60) {
          setErrorMsg('Target Time must be at least 1 hour ahead of current time when selecting today.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLocationId: isAllocated ? undefined : fromLocationId,
          toLocationId: isAllocated ? undefined : toLocationId,
          requiredDate: isAllocated ? undefined : requiredDate,
          requiredTime: isAllocated ? undefined : requiredTime,
          urgency: isAllocated ? undefined : urgency,
          requiredKg: parseFloat(requiredKg) || 0,
          requiredCbm: parseFloat(requiredCbm) || 0,
          boxCount: parseInt(boxCount, 10) || 0,
          goodsReadyStatus,
          invoiceNumbers: invoiceList.join(', '),
          itemDescription,
          remarks,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update request');
      }

      router.push(`/requests/${request.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while updating request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-center gap-2.5 text-xs font-semibold shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: ROUTE & SCHEDULE */}
      <div
        className={`bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4 ${
          isAllocated ? 'opacity-70 bg-gray-50/50' : ''
        }`}
      >
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span>1. Route & Schedule</span>
          </h2>
          {isAllocated && (
            <span className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> Locked (Allocated)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Pickup Origin Location <span className="text-rose-500">*</span>
            </label>
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              disabled={isAllocated}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-2xs font-medium"
            >
              <option value="">-- Select Origin Location --</option>
              {categorizedLocations.plants.length > 0 && (
                <optgroup label="🏭 Plants (Internal)">
                  {categorizedLocations.plants.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {categorizedLocations.warehouses.length > 0 && (
                <optgroup label="🏢 Warehouses">
                  {categorizedLocations.warehouses.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {categorizedLocations.customers.length > 0 && (
                <optgroup label="👥 Customers">
                  {categorizedLocations.customers.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {categorizedLocations.others.length > 0 && (
                <optgroup label="📍 Internal & Other">
                  {categorizedLocations.others.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Delivery Destination <span className="text-rose-500">*</span>
            </label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              disabled={isAllocated}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed shadow-2xs font-medium"
            >
              <option value="">-- Select Destination Location --</option>
              {categorizedLocations.plants.length > 0 && (
                <optgroup label="🏭 Plants (Internal)">
                  {categorizedLocations.plants.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {categorizedLocations.warehouses.length > 0 && (
                <optgroup label="🏢 Warehouses">
                  {categorizedLocations.warehouses.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {categorizedLocations.customers.length > 0 && (
                <optgroup label="👥 Customers">
                  {categorizedLocations.customers.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {categorizedLocations.others.length > 0 && (
                <optgroup label="📍 Internal & Other">
                  {categorizedLocations.others.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Required Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              disabled={isAllocated}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Past dates are disabled. Must be today or future.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Target Departure Time <span className="text-rose-500">*</span>
            </label>
            <select
              value={requiredTime}
              onChange={(e) => setRequiredTime(e.target.value)}
              disabled={isAllocated}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {Array.from({ length: 15 }).map((_, i) => {
                const h = i + 6; // 6 to 20 (06:00 AM to 08:00 PM)
                const hh = String(h).padStart(2, '0');
                const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
                const isPast00 = isSelectedDateToday && h * 60 < nowMins + 60;
                return (
                  <option key={hh} value={`${hh}:00`} disabled={isPast00}>
                    {`${hh}:00`} {isPast00 ? '(Unavailable - min 1h notice)' : ''}
                  </option>
                );
              })}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Operating hours 06:00 AM – 08:00 PM. Minimum 1-hour advance notice buffer required for today.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Delivery Urgency
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              disabled={isAllocated}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="Normal">Normal (Standard dispatch SLA)</option>
              <option value="Urgent">Urgent (Expedited slot priority)</option>
              <option value="Critical">Critical (Line down / urgent shipment)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 2: CARGO & COMMERCIAL INVOICES */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Box className="w-4 h-4 text-indigo-600" />
            <span>2. Cargo Particulars & Commercial Serials</span>
          </h2>
          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
            Editable Anytime
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Total Weight (KG) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={requiredKg}
              onChange={(e) => setRequiredKg(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs tabular-nums font-medium rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Total Volume (CBM) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={requiredCbm}
              onChange={(e) => setRequiredCbm(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs tabular-nums font-medium rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Box / Carton Count <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={boxCount}
              onChange={(e) => setBoxCount(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs tabular-nums font-medium rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Goods Readiness Status
            </label>
            <select
              value={goodsReadyStatus}
              onChange={(e) => setGoodsReadyStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="Ready for Loading">Ready for Loading</option>
              <option value="Not Ready (Under Inspection)">Not Ready (Under Inspection)</option>
              <option value="Packed - Awaiting QA Release">Packed - Awaiting QA Release</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Commercial Invoice Numbers (One Per Line)
              {invoiceList.length > 0 && (
                <span className="ml-2 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-bold">
                  {invoiceList.length} Invoices
                </span>
              )}
            </label>
            <textarea
              rows={3}
              value={invoiceNumbers}
              onChange={(e) => setInvoiceNumbers(e.target.value)}
              placeholder="INV-2026-001&#10;INV-2026-002&#10;INV-2026-003"
              className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Enter each invoice serial on a new line (press Enter).
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Cargo Item Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              required
              placeholder="e.g., Knitted Elastics in Cartons for Export order"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Special Handling / Dispatch Remarks
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Loading bay instructions, gate pass clearances, packaging notices..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/requests/${request.id}`}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-xs"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <span>Save Request Changes</span>
          )}
        </button>
      </div>
    </form>
  );
}
