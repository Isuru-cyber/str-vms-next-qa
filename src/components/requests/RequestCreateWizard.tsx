"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Truck,
  Package,
  ArrowRight,
  ArrowLeft,
  Building2,
  Tag,
  AlertCircle,
  X,
  Receipt,
  RotateCcw,
  Wrench,
  Send,
} from "lucide-react";

interface OperationOption {
  id: number;
  code: string;
  name: string;
  description?: string | null;
}

interface SubOperationOption {
  id: number;
  code: string;
  name: string;
}

interface PlantOption {
  id: number;
  code: string;
  name: string;
}

interface LocationOption {
  id: number;
  locationName: string;
  locationType: string;
  isOrigin: number;
  plantId?: number | null;
  code?: string | null;
  businessGroup?: string | null;
}

interface VehicleTypeOption {
  id: number;
  code: string;
  name: string;
}

interface RequestCreateWizardProps {
  operations: OperationOption[];
  subOperations: SubOperationOption[];
  plants: PlantOption[];
  locations: LocationOption[];
  vehicleTypes: VehicleTypeOption[];
  currentUser?: {
    id: number;
    name: string;
    roleCode: string;
    plantIds?: number[];
  } | null;
}

export function RequestCreateWizard({
  operations,
  subOperations,
  plants,
  locations,
  vehicleTypes,
}: RequestCreateWizardProps) {
  const router = useRouter();

  // Wizard Step: 1 = Operation, 1.5 = Shuttle Coming Soon, 2 = Sub-Operation, 3 = Plant, 4 = Form Entry
  const [step, setStep] = useState<number>(1);

  // Selections
  const [selectedOp, setSelectedOp] = useState<OperationOption | null>(null);
  const [selectedSubOp, setSelectedSubOp] = useState<SubOperationOption | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PlantOption | null>(null);

  // Today and Tomorrow strings
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Time Options strictly between 06:00 AM and 08:00 PM (1-hour intervals)
  const timeOptions = useMemo(() => {
    const list: { value: string; label: string; hour: number; minute: number }[] = [];
    for (let h = 6; h <= 20; h++) {
      const val = `${String(h).padStart(2, "0")}:00`;
      const period = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const label = `${String(displayH).padStart(2, "0")}:00 ${period}`;
      list.push({ value: val, label, hour: h, minute: 0 });
    }
    return list;
  }, []);

  // Default initial date & time (if past 19:00 today, automatically default to tomorrow)
  const defaultInitial = useMemo(() => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const neededMins = currentMins + 60; // 1 hour notice buffer
    const availableToday = timeOptions.find((slot) => slot.hour * 60 + slot.minute >= neededMins);
    if (!availableToday || now.getHours() >= 19) {
      return { date: tomorrowStr, time: "08:00" };
    }
    return { date: todayStr, time: availableToday.value };
  }, [todayStr, tomorrowStr, timeOptions]);

  const [fromLocationId, setFromLocationId] = useState<string>("");
  const [toLocationId, setToLocationId] = useState<string>("");
  const [requiredDate, setRequiredDate] = useState<string>(defaultInitial.date);
  const [requiredTime, setRequiredTime] = useState<string>(defaultInitial.time);
  const [urgency, setUrgency] = useState<string>("Normal");
  const [itemDescription, setItemDescription] = useState<string>("");
  const [goodsReadyStatus, setGoodsReadyStatus] = useState<string>("Ready");
  const [boxCount, setBoxCount] = useState<string>("");
  const [requiredKg, setRequiredKg] = useState<string>("");
  const [requiredCbm, setRequiredCbm] = useState<string>("");
  const [vehicleTypeId, setVehicleTypeId] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [invoiceNumbers, setInvoiceNumbers] = useState<string>("");

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Categorized Locations for Dropdowns (Plants, Warehouses, Customers, Internal/Other)
  const categorizedLocations = useMemo(() => {
    const plantsList = locations
      .filter((l) => l.locationType === "PLANT")
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
    const warehousesList = locations
      .filter((l) => l.locationType === "WAREHOUSE")
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
    const customersList = locations
      .filter((l) => l.locationType === "CUSTOMER")
      .sort((a, b) => a.locationName.localeCompare(b.locationName));
    const othersList = locations
      .filter((l) => !["PLANT", "WAREHOUSE", "CUSTOMER"].includes(l.locationType))
      .sort((a, b) => a.locationName.localeCompare(b.locationName));

    return {
      plants: plantsList,
      warehouses: warehousesList,
      customers: customersList,
      others: othersList,
    };
  }, [locations]);

  // When plant is selected, auto-select matching origin location and item description
  const handlePlantSelect = (plant: PlantOption) => {
    setSelectedPlant(plant);
    // Find matching origin location for this plant
    const matchingOrigin = locations.find(
      (l) => l.plantId === plant.id || l.locationName.toLowerCase().includes(plant.code.toLowerCase())
    );
    if (matchingOrigin) {
      setFromLocationId(String(matchingOrigin.id));
    } else if (categorizedLocations.plants.length > 0) {
      setFromLocationId(String(categorizedLocations.plants[0].id));
    }
    // Set default item description based on sub-operation
    if (selectedSubOp) {
      setItemDescription(`${selectedSubOp.name} - ${plant.code}`);
    }
  };

  // Step 1: Handle Operation Click
  const handleSelectOperation = (op: OperationOption) => {
    setSelectedOp(op);
    if (op.code === "SHUTTLE") {
      setStep(1.5); // Shuttle Coming Soon matching PHP
    } else {
      setStep(2); // Proceed to Sub Operation
    }
  };

  // Step 2: Handle Sub Operation Click
  const handleSelectSubOperation = (subOp: SubOperationOption) => {
    setSelectedSubOp(subOp);
    // If only one plant available to user, pre-select it
    if (plants.length === 1) {
      handlePlantSelect(plants[0]);
    }
    setStep(3); // Proceed to Plant
  };

  // Step 3: Handle Plant Proceed
  const handleProceedToForm = () => {
    if (!selectedPlant) {
      setErrorMsg("Please select a dispatch plant.");
      return;
    }
    setErrorMsg(null);
    setStep(4); // Final Form Entry
  };

  const isToday = requiredDate === todayStr;
  const now = new Date();
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const minRequiredMinutes = currentTotalMinutes + 60; // 1-hour minimum buffer

  // Check if any slot is available for today
  const hasAvailableSlotsToday = useMemo(() => {
    if (!isToday) return true;
    return timeOptions.some((slot) => slot.hour * 60 + slot.minute >= minRequiredMinutes);
  }, [isToday, minRequiredMinutes, timeOptions]);

  // Time buffer validation check
  const isTimeTooEarly = useMemo(() => {
    if (!isToday) return false;
    const [selectedH, selectedM] = requiredTime.split(":").map(Number);
    return selectedH * 60 + (selectedM || 0) < minRequiredMinutes;
  }, [isToday, requiredTime, minRequiredMinutes]);

  // Auto-switch to earliest valid slot if current selection is invalid for today
  useEffect(() => {
    if (isToday) {
      const validSlots = timeOptions.filter((slot) => slot.hour * 60 + slot.minute >= minRequiredMinutes);
      if (validSlots.length > 0) {
        const [selH, selM] = requiredTime.split(":").map(Number);
        const currentSelMins = selH * 60 + (selM || 0);
        if (currentSelMins < minRequiredMinutes) {
          setRequiredTime(validSlots[0].value);
        }
      }
    }
  }, [isToday, requiredDate, minRequiredMinutes, timeOptions, requiredTime]);

  // Is STR1 Finished Goods (requires invoice numbers textarea)
  const isStr1FinishedGoods = useMemo(() => {
    const isFg = selectedSubOp?.name.toLowerCase().includes("finish") || selectedSubOp?.code === "FG";
    const isStr1 =
      selectedPlant?.code === "STR1" ||
      selectedPlant?.name.toUpperCase().includes("STR1") ||
      selectedPlant?.id === 1;
    return Boolean(isFg && isStr1);
  }, [selectedSubOp, selectedPlant]);

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedPlant || !selectedOp || !fromLocationId || !toLocationId || !requiredDate || !requiredTime) {
      setErrorMsg("Please fill in all mandatory fields highlighted with an asterisk (*).");
      return;
    }

    if (requiredDate < todayStr) {
      setErrorMsg("Validation Error: Back-dates are not allowed. Please select today or a future date.");
      return;
    }

    if (isTimeTooEarly) {
      setErrorMsg("Validation Error: Target Time must be at least 1 hour from the current time when selecting today.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/requests/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantId: selectedPlant.id,
          operationId: selectedOp.id,
          subOperationId: selectedSubOp?.id || null,
          vehicleTypeId: vehicleTypeId ? Number(vehicleTypeId) : null,
          fromLocationId: Number(fromLocationId),
          toLocationId: Number(toLocationId),
          requiredDate,
          requiredTime,
          urgency,
          itemDescription,
          goodsReadyStatus,
          boxCount: boxCount ? Number(boxCount) : null,
          requiredKg: requiredKg ? Number(requiredKg) : null,
          requiredCbm: requiredCbm ? Number(requiredCbm) : null,
          remarks: remarks || null,
          invoiceNumbers: isStr1FinishedGoods ? invoiceNumbers || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit transport request.");
      }

      router.push(`/requests/${data.request.id}`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "A network error occurred while submitting.");
      setSubmitting(false);
    }
  };

  // =========================================================================
  // STEP 1: SELECT OPERATION TYPE
  // =========================================================================
  if (step === 1) {
    const shuttleOp = operations.find((o) => o.code === "SHUTTLE") || {
      id: 1,
      code: "SHUTTLE",
      name: "Shuttle Operation",
      description: "For direct plant-to-plant regular scheduled shuttles.",
    };
    const fgOp = operations.find((o) => o.code === "FG_OTHER") || {
      id: 2,
      code: "FG_OTHER",
      name: "FG & Other Operation",
      description: "Finished goods, Returns, Samples, and Ad Hoc deliveries.",
    };

    return (
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Select Operation Type
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose the primary category for this transportation request
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-stretch gap-5 max-w-2xl mx-auto">
          {/* Shuttle Card */}
          <div
            onClick={() => handleSelectOperation(shuttleOp)}
            className="group bg-white rounded-xl shadow-xs border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer p-6 sm:p-7 text-center flex-1 flex flex-col items-center justify-between"
          >
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
                SHUTTLE OPERATION
              </h3>
              <p className="text-slate-500 text-xs px-2 leading-relaxed">
                For direct plant-to-plant regular scheduled shuttles.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-all">
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>

          {/* FG & Other Card */}
          <div
            onClick={() => handleSelectOperation(fgOp)}
            className="group bg-white rounded-xl shadow-xs border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all duration-200 cursor-pointer p-6 sm:p-7 text-center flex-1 flex flex-col items-center justify-between"
          >
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 mb-4 shadow-2xs group-hover:scale-105 transition-transform">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1.5 uppercase tracking-wide">
                FG &amp; OTHER
              </h3>
              <p className="text-slate-500 text-xs px-2 leading-relaxed">
                For finished goods, commercial dispatches, samples, and ad hoc requirements.
              </p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-all">
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 1.5: SHUTTLE COMING SOON
  // =========================================================================
  if (step === 1.5) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
            <Wrench className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Coming Soon</h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
            Shuttle operation request module is currently under development. Please use FG &amp; Other Operation for cargo dispatch.
          </p>
          <div className="pt-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Operations</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 2: SELECT SUB OPERATION
  // =========================================================================
  if (step === 2) {
    return (
      <div className="max-w-4xl mx-auto py-6 px-4 text-center">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Select Sub Operation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose the specific delivery subtype
          </p>
        </div>

        <div className="flex flex-wrap justify-center items-stretch gap-3.5 max-w-3xl mx-auto mb-6">
          {subOperations.map((so) => (
            <div
              key={so.id}
              onClick={() => handleSelectSubOperation(so)}
              className="group bg-white rounded-xl shadow-xs border border-slate-200 px-5 py-4 hover:border-blue-500 hover:shadow-md hover:bg-blue-50/20 transition-all cursor-pointer flex items-center justify-center min-w-[200px] max-w-[260px] h-[72px] text-center"
            >
              <span className="font-bold text-slate-800 text-[13px] tracking-wide uppercase group-hover:text-blue-700 transition-colors">
                {so.name}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep(1)}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  // =========================================================================
  // STEP 3: SELECT PLANT
  // =========================================================================
  if (step === 3) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4 text-center">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Select Plant
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Select the dispatch plant for {selectedSubOp?.name}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sm:p-6 max-w-2xl mx-auto mb-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-wrap justify-center items-center gap-3.5 mb-6">
            {plants.map((p) => {
              const isSelected = selectedPlant?.id === p.id;
              const displayName = p.name.replace(/^Plant\s+/i, "");
              return (
                <div
                  key={p.id}
                  onClick={() => handlePlantSelect(p)}
                  className={`rounded-xl border py-4 px-6 text-center cursor-pointer transition-all min-w-[170px] max-w-[210px] ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20 shadow-sm"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 bg-white shadow-2xs"
                  }`}
                >
                  <span className="font-bold text-slate-900 text-[13.5px] uppercase block tracking-tight">
                    {displayName}
                  </span>
                  <span className={`text-xs font-semibold block mt-0.5 ${isSelected ? "text-blue-600" : "text-slate-400"}`}>
                    ({p.code})
                  </span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleProceedToForm}
            disabled={!selectedPlant}
            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-xs text-xs cursor-pointer"
          >
            <span>Proceed to Request Form</span>
            <ArrowRight className="w-4 h-4 font-bold" />
          </button>
        </div>

        <button
          onClick={() => setStep(2)}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go Back</span>
        </button>
      </div>
    );
  }

  // =========================================================================
  // STEP 4: FINAL VEHICLE TRANSPORT REQUEST ENTRY FORM
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12 px-2 sm:px-4">
      {/* Clean Metadata Badge Bar (Top redundant title removed per user request) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Plant Pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Plant: {selectedPlant?.code || "STR1"}</span>
          </span>

          {/* Sub Operation Pill */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800">
            <Tag className="w-3.5 h-3.5 text-blue-600" />
            <span>{selectedSubOp?.name || "Finished Goods"}</span>
          </span>

          {/* Business Group */}
          <span className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-600">
            ELASTIC
          </span>
        </div>

        {/* Change Selection Link */}
        <button
          type="button"
          onClick={() => setStep(1)}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
          title="Restart selection from Operation"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Change Selection</span>
        </button>
      </div>

      {/* Validation Error Alert */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-semibold shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-700 p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Request Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: ROUTE & SCHEDULE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
              1. Route &amp; Schedule
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                From Location <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={fromLocationId}
                onChange={(e) => setFromLocationId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs"
              >
                <option value="">-- Select Pickup Location --</option>
                {categorizedLocations.plants.length > 0 && (
                  <optgroup label="🏭 Plants (Internal)">
                    {categorizedLocations.plants.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categorizedLocations.warehouses.length > 0 && (
                  <optgroup label="🏢 Warehouses">
                    {categorizedLocations.warehouses.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categorizedLocations.customers.length > 0 && (
                  <optgroup label="👥 Customers">
                    {categorizedLocations.customers.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categorizedLocations.others.length > 0 && (
                  <optgroup label="📍 Internal & Other">
                    {categorizedLocations.others.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                To Destination <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={toLocationId}
                onChange={(e) => setToLocationId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none shadow-2xs"
              >
                <option value="">-- Select Destination Location --</option>
                {categorizedLocations.plants.length > 0 && (
                  <optgroup label="🏭 Plants (Internal)">
                    {categorizedLocations.plants.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categorizedLocations.warehouses.length > 0 && (
                  <optgroup label="🏢 Warehouses">
                    {categorizedLocations.warehouses.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categorizedLocations.customers.length > 0 && (
                  <optgroup label="👥 Customers">
                    {categorizedLocations.customers.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categorizedLocations.others.length > 0 && (
                  <optgroup label="📍 Internal & Other">
                    {categorizedLocations.others.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.locationName} {loc.code ? `(${loc.code})` : ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Required Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Target Time <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={requiredTime}
                onChange={(e) => setRequiredTime(e.target.value)}
                disabled={isToday && !hasAvailableSlotsToday}
                className={`w-full text-xs font-semibold border rounded-lg p-2 focus:outline-none ${
                  isTimeTooEarly
                    ? "bg-rose-50 border-rose-300 text-rose-800"
                    : "bg-white border-slate-300 text-slate-800 focus:ring-1 focus:ring-indigo-500"
                }`}
              >
                {timeOptions.map((t) => {
                  const isDisabled = isToday && t.hour * 60 + t.minute < minRequiredMinutes;
                  return (
                    <option key={t.value} value={t.value} disabled={isDisabled}>
                      {t.label} {isDisabled ? "(Unavailable - 1h notice needed)" : ""}
                    </option>
                  );
                })}
              </select>
              {isToday && !hasAvailableSlotsToday ? (
                <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Same-day booking closed for today (06:00 AM – 08:00 PM operating window with 1h notice). Please pick tomorrow or a future date.</span>
                </div>
              ) : isTimeTooEarly ? (
                <p className="text-[10.5px] text-rose-600 font-semibold mt-1">
                  Target time must be at least 1 hour ahead of current time for today.
                </p>
              ) : (
                <p className="text-[10.5px] text-slate-400 mt-1">
                  Available 06:00 AM – 08:00 PM (1-hour advance buffer required for today).
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Urgency Priority
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: CARGO & SPECIFICATIONS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
              2. Cargo &amp; Specifications
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Item Description <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. FG Elastic Tapes, Sample Cartons"
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Goods Readiness
              </label>
              <select
                value={goodsReadyStatus}
                onChange={(e) => setGoodsReadyStatus(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Ready">Ready for Loading</option>
                <option value="Not Ready">Not Ready (Packing / Inspection)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Box Count <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={boxCount}
                  onChange={(e) => setBoxCount(e.target.value)}
                  placeholder="0"
                  className="w-full text-xs font-bold tabular-nums bg-white border border-slate-300 rounded-lg p-2 pr-14 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  Boxes
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Weight (KG) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.1"
                  step="0.01"
                  required
                  value={requiredKg}
                  onChange={(e) => setRequiredKg(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs font-bold tabular-nums bg-white border border-slate-300 rounded-lg p-2 pr-12 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  KG
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Volume (CBM)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={requiredCbm}
                  onChange={(e) => setRequiredCbm(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-xs font-bold tabular-nums bg-white border border-slate-300 rounded-lg p-2 pr-12 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                  CBM
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: VEHICLE PREFERENCE & REMARKS */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
              3. Vehicle &amp; Remarks
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Preferred Vehicle Type
              </label>
              <select
                value={vehicleTypeId}
                onChange={(e) => setVehicleTypeId(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">-- Any Fleet Vehicle --</option>
                {vehicleTypes.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Remarks
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Special handling instructions, gate notes..."
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: DELIVERY INVOICE NUMBERS (STR1 FINISHED GOODS ONLY) */}
        {isStr1FinishedGoods && (
          <div className="bg-white border border-blue-200 rounded-xl p-5 sm:p-6 shadow-2xs space-y-3">
            <div className="border-b border-blue-100 pb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>4. Delivery Invoice Numbers</span>
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                STR1 Finished Goods
              </span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Invoice Numbers (Enter line by line)</span>
                <span className="text-[11px] font-normal text-slate-400">One per line</span>
              </label>
              <textarea
                rows={4}
                value={invoiceNumbers}
                onChange={(e) => setInvoiceNumbers(e.target.value)}
                placeholder={"INV-10023\nINV-10024\nINV-10025"}
                className="w-full text-xs font-sans tabular-nums bg-white border border-blue-200 rounded-lg p-3 focus:ring-1 focus:ring-blue-500 focus:outline-none leading-relaxed"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">
                Type or paste invoice numbers. Press Enter after each invoice number to add the next one on a new line.
              </p>
            </div>
          </div>
        )}

        {/* ACTIONS BAR */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep(3)}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2.5">
            <Link
              href="/requests"
              className="px-4 py-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 transition-colors inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "Submitting..." : "Submit Request"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
