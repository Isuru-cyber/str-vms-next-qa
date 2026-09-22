"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Truck,
  Combine,
  ArrowUp,
  ArrowDown,
  Trash2,
  Send,
  Mail,
  CheckCircle2,
  TrendingDown,
  Building2,
  FileText,
  AlertCircle,
  AlertTriangle,
  Clock,
  Check,
  Plus,
  ArrowRightLeft,
  Info,
  ExternalLink,
  ShieldCheck,
  Compass,
  User,
  Package,
  X,
  Printer,
  RotateCcw,
  RotateCw,
  Sparkles,
  MapPin,
  GripVertical,
  Save,
  Copy,
  Maximize2,
  Search,
} from "lucide-react";
import { CostCalculator } from "@/lib/cost-calculator";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface CombineWorkbenchClientProps {
  initialTrip: any;
  initialLinkedRequests: any[];
  initialAvailableRequests: any[];
  activeTargetTrips: any[];
  routes: any[];
  dieselRate: number;
}

const DEFAULT_MAIL_TEMPLATES = [
  {
    templateKey: "allocation_confirmed",
    name: "Vehicle Allocation Confirmation",
    subject: "Vehicle Allocation Confirmed: Trip {trip_no} | {vehicle_number} - {route_name}",
    body: `Dear Requester(s),\n\nWe are pleased to inform you that your transportation request(s) have been successfully allocated and scheduled for dispatch.\n\n=======================================================\nTRIP & ALLOCATION DETAILS\n=======================================================\n• Trip Number      : {trip_no}\n• Allocation Date  : {allocation_date}\n• Assigned Route   : {route_name}\n• Trip Status      : {status}\n• Planned Distance : {planned_km} km\n\n=======================================================\nASSIGNED FLEET & DRIVER DETAILS\n=======================================================\n• Vehicle Number   : {vehicle_number} ({vehicle_type})\n• Driver Name      : {driver_name}\n• Driver NIC / ID  : {driver_nic}\n• Contact Mobile   : {driver_mobile}\n• License Number   : {driver_license}\n\n=======================================================\nALLOCATED REQUESTS BREAKDOWN\n=======================================================\n{requests_breakdown}\n\n=======================================================\nPlease ensure all gate passes, loading bays, and personnel are prepared accordingly.\nFor any inquiries or schedule updates, please contact the Logistics & Fleet Desk.\n\nBest Regards,\nLogistics & Fleet Operations Team\nSTR Vehicle Management System (VMS)`,
  },
  {
    templateKey: "dispatch_departure_notice",
    name: "Dispatch & Driver Gate-Pass Notification",
    subject: "[DISPATCH & GATE PASS] Vehicle {vehicle_number} | Trip #{trip_no} ({route_name})",
    body: `GATE PASS & FLEET DISPATCH CLEARANCE NOTICE\n=======================================================\n• Trip Number   : {trip_no}\n• Route         : {route_name}\n• Departure Date: {allocation_date}\n\nFLEET & DRIVER DETAILS\n=======================================================\n• Driver Name   : {driver_name} (NIC: {driver_nic})\n• Contact Mobile: {driver_mobile}\n• Vehicle Plate : {vehicle_number} ({vehicle_type})\n\nCONSOLIDATED CARGO MANIFEST\n=======================================================\n{requests_breakdown}\n\nTotal Net Weight: {total_kg} KG | Total Volume: {total_cbm} CBM\n\nSTR Central Fleet Dispatch Management`,
  },
  {
    templateKey: "request_rejected",
    name: "Request Rejection Notice",
    subject: "[STR VMS] Action Required: Vehicle Request {request_code} Rejected",
    body: `Dear {requester_name},\n\nPlease be informed that your Vehicle Transport Request {request_code} has been REJECTED by Central Fleet Dispatch.\n\nRequest Details:\n- Request ID: {request_code}\n- Plant: {plant_name}\n- Route: {from_location} -> {to_location}\n- Cargo / Item: {item_description}\n- Required Date: {required_date} {required_time}\n- Reason for Rejection: {rejection_reason}\n\nNext Steps:\nPlease revise your schedule or contact the Central Fleet Dispatch team if an urgent alternative arrangement is required.\n\nBest regards,\nCentral Fleet Dispatch Management\nSTR Logistics Department`,
  },
  {
    templateKey: "request_cancelled",
    name: "Request Cancellation Notice",
    subject: "[STR VMS] Notice: Vehicle Request {request_code} Cancelled",
    body: `Dear {requester_name},\n\nVehicle Transport Request {request_code} has been CANCELLED.\n\nRequest Details:\n- Request ID: {request_code}\n- Plant: {plant_name}\n- Route: {from_location} -> {to_location}\n- Cargo / Item: {item_description}\n- Cancellation Reason: {cancellation_reason}\n\nBest regards,\nSTR Logistics Operations`,
  },
];

export function CombineWorkbenchClient({
  initialTrip,
  initialLinkedRequests,
  initialAvailableRequests,
  activeTargetTrips,
  routes,
  dieselRate,
}: CombineWorkbenchClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [trip, setTrip] = useState(initialTrip);
  const [includedRequests, setIncludedRequests] = useState<any[]>(initialLinkedRequests);
  const [availableRequests, setAvailableRequests] = useState<any[]>(initialAvailableRequests);
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    trip?.routeId ? String(trip.routeId) : ""
  );
  const [plannedKm, setPlannedKm] = useState<number>(
    Number(trip?.plannedKm) || 0
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // In-app Toast & Confirmation Modal
  const [toast, setToast] = useState<{ type: "success" | "error" | "warning"; message: string } | null>(null);
  const showToast = (type: "success" | "error" | "warning", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Modals state
  const [detailsModalReq, setDetailsModalReq] = useState<any | null>(null);
  const [transferModalReq, setTransferModalReq] = useState<any | null>(null);
  const [targetTripId, setTargetTripId] = useState<string>("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [outlookModalOpen, setOutlookModalOpen] = useState(false);

  // Mail Templates State
  const [mailTemplates, setMailTemplates] = useState<any[]>(DEFAULT_MAIL_TEMPLATES);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("allocation_confirmed");
  const [draftSubject, setDraftSubject] = useState<string>("");
  const [draftBody, setDraftBody] = useState<string>("");
  const [copySubjectSuccess, setCopySubjectSuccess] = useState<boolean>(false);
  const [copyBodySuccess, setCopyBodySuccess] = useState<boolean>(false);

  const [isCompleting, setIsCompleting] = useState(false);

  const isCompleted = ["COMPLETED", "RECONCILED", "FINALIZED", "CLOSED"].includes(trip?.status);
  const isDispatched = ["DISPATCHED", "IN_TRANSIT", "GATE_PASS_ISSUED"].includes(trip?.status);
  const isLocked = isCompleted || isDispatched || trip?.status === "READY_FOR_LOADING";

  // Capacity Limits
  const maxPayloadKg = Number(trip?.vehicle?.maxPayloadKg) > 0 ? Number(trip.vehicle.maxPayloadKg) : 1000;
  const maxVolumeCbm = Number(trip?.vehicle?.maxVolumeCbm) > 0 ? Number(trip.vehicle.maxVolumeCbm) : 20;

  // Totals
  const totalKg = includedRequests.reduce((sum, r) => sum + (Number(r.requiredKg) || 0), 0);
  const totalCbm = includedRequests.reduce((sum, r) => sum + (Number(r.requiredCbm) || 0), 0);
  const totalBoxes = includedRequests.reduce((sum, r) => sum + (Number(r.boxCount) || 0), 0);

  // Capacity Percentages
  const pctKgReal = (totalKg / maxPayloadKg) * 100;
  const pctKgDisplay = Math.min(100, pctKgReal);
  const isKgOverloaded = totalKg > maxPayloadKg;
  const barKgColor = isKgOverloaded
    ? "bg-rose-500"
    : pctKgReal > 85
    ? "bg-amber-500"
    : "bg-indigo-600";

  const pctCbmReal = (totalCbm / maxVolumeCbm) * 100;
  const pctCbmDisplay = Math.min(100, pctCbmReal);
  const isCbmOverloaded = totalCbm > maxVolumeCbm;
  const barCbmColor = isCbmOverloaded
    ? "bg-rose-500"
    : pctCbmReal > 85
    ? "bg-amber-500"
    : "bg-indigo-600";

  const isOverloaded = isKgOverloaded || isCbmOverloaded;

  // Cost & Savings Calculations
  const costBreakdown = CostCalculator.calculateTripCost(
    plannedKm,
    trip?.vehicle || {},
    dieselRate,
    1
  );

  const consolidationSavings = CostCalculator.calculateConsolidationSavings(
    costBreakdown.total_trip_cost,
    trip?.vehicle || {},
    includedRequests.map((r) => ({
      id: r.id,
      requestCode: r.requestCode,
      plannedDistanceKm: Number(r.plannedDistanceKm) || 50,
    })),
    dieselRate
  );

  const costShare = CostCalculator.allocateRequestCostShare(
    costBreakdown.total_trip_cost,
    includedRequests.map((r) => ({
      id: r.id,
      requestCode: r.requestCode,
      requiredKg: Number(r.requiredKg) || 0,
      requiredCbm: Number(r.requiredCbm) || 0,
    }))
  );

  // Loading Order Labels
  const getLoadingTag = (index: number, total: number) => {
    if (total === 1) return "1st & Door Loading";
    if (index === total - 1) return "Door Loading"; // Last cargo loaded, first offloaded
    if (index === 0) return "1st Loading"; // Deepest cargo
    if (index === 1) return "2nd Loading";
    if (index === 2) return "3rd Loading";
    return `${index + 1}th Loading`;
  };

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [suggestedRoutes, setSuggestedRoutes] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceSearch, setWorkspaceSearch] = useState("");

  const currentRouteName = useMemo(() => {
    if (selectedRouteId) {
      const found =
        suggestedRoutes.find((r) => String(r.id) === String(selectedRouteId)) ||
        routes.find((r) => String(r.id) === String(selectedRouteId));
      if (found) return found.route_name || found.routeName;
    }
    return trip?.route?.routeName || "-";
  }, [selectedRouteId, suggestedRoutes, routes, trip]);

  const currentRouteCode = useMemo(() => {
    if (selectedRouteId) {
      const found =
        suggestedRoutes.find((r) => String(r.id) === String(selectedRouteId)) ||
        routes.find((r) => String(r.id) === String(selectedRouteId));
      if (found) return found.route_code || found.routeCode;
    }
    return trip?.route?.routeCode || "RTE-COMBINED";
  }, [selectedRouteId, suggestedRoutes, routes, trip]);

  const filteredWorkspaceAvailable = useMemo(() => {
    if (!workspaceSearch.trim()) return availableRequests;
    const q = workspaceSearch.toLowerCase();
    return availableRequests.filter((r) => {
      return (
        (r.requestCode || "").toLowerCase().includes(q) ||
        (r.plant?.code || "").toLowerCase().includes(q) ||
        (r.fromLocation?.locationName || r.fromName || "").toLowerCase().includes(q) ||
        (r.toLocation?.locationName || r.toName || "").toLowerCase().includes(q) ||
        (r.invoiceNumbers || "").toLowerCase().includes(q)
      );
    });
  }, [availableRequests, workspaceSearch]);

  // Auto-suggest corridor routes based on included requests' origin and destinations
  const fetchSuggestedRoutes = async (requestsList: any[], isActionTriggered = false) => {
    if (requestsList.length === 0) {
      setSuggestedRoutes([]);
      setSelectedRouteId("");
      setPlannedKm(0);
      return;
    }

    const fromId = requestsList[0]?.fromLocationId || requestsList[0]?.from_location_id || requestsList[0]?.fromLocation?.id;
    const toIds = Array.from(
      new Set(
        requestsList
          .map((r) => r.toLocationId || r.to_location_id || r.toLocation?.id)
          .filter(Boolean)
      )
    );

    if (!fromId || toIds.length === 0) {
      setSuggestedRoutes([]);
      if (!trip?.routeId) {
        setSelectedRouteId("");
        setPlannedKm(0);
      }
      return;
    }

    setLoadingSuggestions(true);
    try {
      const res = await fetch(`/api/routes/suggest?from_id=${fromId}&to_ids=${toIds.join(",")}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSuggestedRoutes(data);
        let targetSelectId = "";
        if (isActionTriggered) {
          // Automatically select the best matching route when adding or removing requests
          targetSelectId = String(data[0].id);
        } else {
          // On initial load, preserve current if exists in suggestions, else pick best match
          const exists = data.some((r) => String(r.id) === String(selectedRouteId));
          targetSelectId = exists ? String(selectedRouteId) : String(data[0].id);
        }
        setSelectedRouteId(targetSelectId);
        const chosen = data.find((r) => String(r.id) === targetSelectId) || data[0];
        const dist = Number(chosen.total_distance || chosen.total_distance_km || chosen.totalDistanceKm || 0);
        setPlannedKm(dist);
        if (isActionTriggered) {
          setHasUnsavedChanges(true);
        }
      } else {
        // No exact matching routes found
        setSuggestedRoutes([]);
        setSelectedRouteId("");
        setPlannedKm(0);
        if (isActionTriggered) {
          setHasUnsavedChanges(true);
        }
      }
    } catch (err) {
      console.error("Failed to suggest routes:", err);
      setSuggestedRoutes([]);
      if (!selectedRouteId && !trip?.routeId) {
        setSelectedRouteId("");
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Warn on unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Sync state when props refresh from server actions / revalidations
  useEffect(() => {
    setIncludedRequests(initialLinkedRequests);
  }, [initialLinkedRequests]);

  useEffect(() => {
    setAvailableRequests(initialAvailableRequests);
  }, [initialAvailableRequests]);

  useEffect(() => {
    setTrip(initialTrip);
  }, [initialTrip]);

  useEffect(() => {
    if (initialLinkedRequests.length > 0) {
      fetchSuggestedRoutes(initialLinkedRequests, false);
    }
  }, []);

  // Listen to window focus, storage (cross-tab route creation), and postMessage
  useEffect(() => {
    const handleFocus = () => {
      if (includedRequests.length > 0) {
        fetchSuggestedRoutes(includedRequests, false);
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "ROUTE_CREATED") {
        if (includedRequests.length > 0) {
          fetchSuggestedRoutes(includedRequests, true);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "STR_ROUTE_CREATED_TS") {
        if (includedRequests.length > 0) {
          fetchSuggestedRoutes(includedRequests, true);
        }
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [includedRequests, selectedRouteId]);

  // Reorder: Move Up (Local Staged)
  const moveUp = (index: number) => {
    if (index === 0 || isLocked) return;
    const items = [...includedRequests];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    const reindexed = items.map((r, idx) => ({ ...r, loadingSequence: idx + 1 }));
    setIncludedRequests(reindexed);
    setHasUnsavedChanges(true);
  };

  // Reorder: Move Down (Local Staged)
  const moveDown = (index: number) => {
    if (index === includedRequests.length - 1 || isLocked) return;
    const items = [...includedRequests];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    const reindexed = items.map((r, idx) => ({ ...r, loadingSequence: idx + 1 }));
    setIncludedRequests(reindexed);
    setHasUnsavedChanges(true);
  };

  // HTML5 Drag & Drop Reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isLocked) return;
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isLocked) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (isLocked) return;
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const items = [...includedRequests];
    const [draggedItem] = items.splice(draggedIdx, 1);
    items.splice(targetIndex, 0, draggedItem);
    const reindexed = items.map((r, idx) => ({ ...r, loadingSequence: idx + 1 }));
    setIncludedRequests(reindexed);
    setHasUnsavedChanges(true);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Add request to container (Local Staged - No auto-save)
  const handleAddRequest = (req: any) => {
    if (isLocked) return;
    const reqId = req.id;
    if (includedRequests.some((r) => r.id === reqId)) return;

    const updated = [
      ...includedRequests,
      { ...req, loadingSequence: includedRequests.length + 1 },
    ].map((r, idx) => ({ ...r, loadingSequence: idx + 1 }));

    setIncludedRequests(updated);
    setAvailableRequests((prev) => prev.filter((r) => r.id !== reqId));
    setHasUnsavedChanges(true);
    fetchSuggestedRoutes(updated, true);
  };

  // Remove request from container (Local Staged - No auto-save)
  const handleRemoveRequest = (req: any) => {
    if (isLocked) return;
    const reqId = typeof req === "object" && req !== null ? req.id : Number(req);
    const targetObj = typeof req === "object" && req !== null ? req : includedRequests.find((r) => r.id === reqId);
    if (!targetObj) return;

    const updated = includedRequests
      .filter((r) => r.id !== reqId)
      .map((r, idx) => ({ ...r, loadingSequence: idx + 1 }));

    setIncludedRequests(updated);
    setAvailableRequests((prev) => {
      if (prev.some((r) => r.id === targetObj.id)) return prev;
      return [
        {
          ...targetObj,
          status: "SUBMITTED",
        },
        ...prev,
      ];
    });

    setHasUnsavedChanges(true);
    fetchSuggestedRoutes(updated, true);
  };

  // Transfer request to another active trip
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferModalReq || !targetTripId) return;
    setIsTransferring(true);
    try {
      const res = await fetch("/api/allocations/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transfer",
          sourceTripId: trip.id,
          targetTripId: Number(targetTripId),
          requestId: transferModalReq.id,
        }),
      });
      if (res.ok) {
        setIncludedRequests((prev) => prev.filter((r) => r.id !== transferModalReq.id));
        setTransferModalReq(null);
        setTargetTripId("");
        showToast("success", "Request transferred successfully!");
        router.refresh();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast("error", errData.message || "Failed to transfer request.");
      }
    } catch (e) {
      console.error(e);
      showToast("error", "An unexpected error occurred during transfer.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Change route & KM (Staged)
  const handleRouteChange = (routeId: string) => {
    setSelectedRouteId(routeId);
    let newKm = plannedKm;
    if (routeId) {
      const selected =
        routes.find((r) => String(r.id) === routeId) ||
        suggestedRoutes.find((r) => String(r.id) === routeId);
      if (selected && (selected.totalDistanceKm || selected.total_distance)) {
        newKm = Number(selected.totalDistanceKm || selected.total_distance);
        setPlannedKm(newKm);
      }
    }
    setHasUnsavedChanges(true);
  };

  // Save Allocation Handler (Single Batch Commit)
  const handleSaveAllocation = async () => {
    if (includedRequests.length === 0) {
      showToast("warning", "Please load at least one cargo request before saving allocation.");
      return;
    }

    if (!selectedRouteId) {
      showToast("warning", "Please select a corridor route before saving the allocation.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/allocations/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-allocation",
          tripId: trip.id,
          routeId: selectedRouteId ? Number(selectedRouteId) : null,
          plannedKm: Number(plannedKm) || 0,
          requestIds: includedRequests.map((r) => r.id),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHasUnsavedChanges(false);
        showToast("success", "Allocation saved successfully!");
        router.refresh();
      } else {
        showToast("error", data.message || "Failed to save allocation.");
      }
    } catch (err: any) {
      showToast("error", err.message || "Network error while saving allocation.");
    } finally {
      setSaving(false);
    }
  };

  // Dispatch to Factory Loading Deck
  const handleDispatchDeck = async () => {
    if (hasUnsavedChanges) {
      showToast("warning", "You have unsaved modifications. Please click 'Save Allocation' before dispatching to the Loading Deck.");
      return;
    }
    if (!trip?.vehicleId && !trip?.vehicle) {
      showToast("warning", "Cannot dispatch: No vehicle has been assigned to this trip.");
      return;
    }
    if (!trip?.driverId && !trip?.driver) {
      showToast("warning", "Cannot dispatch: No driver has been assigned to this trip.");
      return;
    }
    if (includedRequests.length === 0) {
      showToast("warning", "Cannot dispatch: The trip has no cargo/requests included.");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "Dispatch to Factory Loading Deck",
      message: "Dispatch this vehicle allocation to the Factory Loading Deck for physical loading & Gate Pass?",
      confirmText: "Yes, Dispatch",
      isDestructive: false,
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await fetch("/api/allocations/combine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "dispatch-to-deck", tripId: trip.id }),
          });
          if (res.ok) {
            setTrip((prev: any) => ({ ...prev, status: "READY_FOR_LOADING" }));
            router.push("/dispatch/deck");
            router.refresh();
          } else {
            const errData = await res.json().catch(() => ({}));
            showToast("error", errData.message || "Failed to dispatch trip to loading deck.");
          }
        } catch (e) {
          console.error(e);
          showToast("error", "An error occurred while dispatching to loading deck.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // Quick Dispatch Complete (Locks edits, marks COMPLETED, releases fleet to AVAILABLE)
  const handleQuickDispatchComplete = async () => {
    if (includedRequests.length === 0) {
      showToast("warning", "Cannot complete: The trip has no cargo/requests included.");
      return;
    }
    if (hasUnsavedChanges) {
      showToast("warning", "You have unsaved modifications. Please click 'Save Allocation' first.");
      return;
    }
    const confirmMsg =
      `Are you sure you want to mark Trip #${trip?.tripNo} as COMPLETED?\n\n` +
      `• Trip Status will change to 'COMPLETED'\n` +
      `• All ${includedRequests.length} included requests will change to 'COMPLETED'\n` +
      `• Assigned Vehicle and Driver will be released to 'AVAILABLE'\n` +
      `• Future edits on this trip will be locked`;

    setConfirmModal({
      isOpen: true,
      title: "⚡ Quick Dispatch Complete",
      message: confirmMsg,
      confirmText: "Complete Trip",
      isDestructive: false,
      onConfirm: async () => {
        setIsCompleting(true);
        try {
          const res = await fetch(`/api/trips/${trip.id}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setTrip((prev: any) => ({ ...prev, status: "COMPLETED" }));
            showToast("success", `Trip #${trip.tripNo} marked as COMPLETED! Vehicle & Driver released.`);
            router.refresh();
          } else {
            showToast("error", data.message || "Failed to complete trip.");
          }
        } catch (err: any) {
          console.error(err);
          showToast("error", err.message || "An error occurred while completing trip.");
        } finally {
          setIsCompleting(false);
        }
      },
    });
  };

  // Reverse Trip (Rollback allocation, revert requests to SUBMITTED, release fleet)
  const handleReverseTrip = async () => {
    const msg =
      "⚠️ WARNING: Are you sure you want to REVERSE and CANCEL this Trip?\n\n" +
      "• All included requests will return to 'SUBMITTED' status.\n" +
      "• The assigned vehicle and driver will become 'AVAILABLE'.\n" +
      "• Any issued gate pass entries for this trip will be removed.\n" +
      "• This trip allocation will be completely deleted.";

    setConfirmModal({
      isOpen: true,
      title: "Reverse and Cancel Trip",
      message: msg,
      confirmText: "Reverse Trip",
      isDestructive: true,
      onConfirm: async () => {
        setSaving(true);
        try {
          const res = await fetch("/api/allocations/combine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reverse", tripId: trip.id }),
          });
          if (res.ok) {
            router.push("/allocations/fg/combine");
            router.refresh();
          } else {
            const data = await res.json();
            showToast("error", data.error || "Failed to reverse trip.");
          }
        } catch (e) {
          console.error(e);
          showToast("error", "An unexpected error occurred while reversing trip.");
        } finally {
          setSaving(false);
        }
      },
    });
  };

  const showNotification = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Fetch configured mail templates from Settings API
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

  // Helper to compile placeholders into mail template
  const compileMailTemplate = (tKey: string) => {
    const tpl =
      mailTemplates.find((t) => t.templateKey === tKey) ||
      DEFAULT_MAIL_TEMPLATES.find((t) => t.templateKey === tKey) ||
      DEFAULT_MAIL_TEMPLATES[0];

    const breakdownText = includedRequests
      .map((r, i) => {
        let loadingLabel = `${i + 1}th Loading`;
        if (includedRequests.length > 1 && i === includedRequests.length - 1) {
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
      trip_no: trip?.tripNo || "TRIP-NEW",
      allocation_date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      route_name: currentRouteName || "Combined Fleet Route",
      status: trip?.status || "ALLOCATED",
      planned_km: String(plannedKm || 0),
      vehicle_number: trip?.vehicle?.vehicleNumber || "Unassigned",
      vehicle_type: trip?.vehicle?.vehicleType || "Standard Fleet",
      driver_name: trip?.driver?.name || "Assigned Driver",
      driver_nic: trip?.driver?.nic || "N/A",
      driver_mobile: trip?.driver?.mobile || "N/A",
      driver_license: trip?.driver?.licenseNumber || trip?.driver?.license || "N/A",
      total_cbm: totalCbm.toFixed(2),
      total_kg: Math.round(totalKg).toLocaleString(),
      requests_breakdown: breakdownText || "No requests linked yet",
      plant_name: includedRequests[0]?.plant?.name || includedRequests[0]?.plantCode || "STR Plant",
      from_location: includedRequests[0]?.fromLocation?.locationName || "STR Plant Origin",
      to_location: includedRequests[includedRequests.length - 1]?.toLocation?.locationName || "Warehouse Destination",
      item_description: includedRequests.map((r) => r.itemDescription).filter(Boolean).join(", ") || "General Finished Goods",
      required_date: includedRequests[0]?.requiredDate ? new Date(includedRequests[0].requiredDate).toLocaleDateString() : "-",
      required_time: includedRequests[0]?.requiredTime || "-",
      requester_name: includedRequests[0]?.requester?.name || "Plant Logistics Requester",
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

  // Re-compile when modal opens or template changes
  useEffect(() => {
    if (outlookModalOpen) {
      const compiled = compileMailTemplate(selectedTemplateKey);
      setDraftSubject(compiled.subject);
      setDraftBody(compiled.body);
    }
  }, [outlookModalOpen, selectedTemplateKey, includedRequests, trip, currentRouteName, plannedKm]);

  const handleTemplateChange = (newKey: string) => {
    setSelectedTemplateKey(newKey);
    const compiled = compileMailTemplate(newKey);
    setDraftSubject(compiled.subject);
    setDraftBody(compiled.body);
  };

  const handleCopySubject = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(draftSubject);
      setCopySubjectSuccess(true);
      setTimeout(() => setCopySubjectSuccess(false), 2000);
    }
  };

  const handleCopyBody = () => {
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
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold transition-all border animate-in fade-in slide-in-from-top-2 duration-150 ${
            toast.type === "success"
              ? "bg-emerald-600 border-emerald-500"
              : toast.type === "warning"
              ? "bg-amber-600 border-amber-500"
              : "bg-rose-600 border-rose-500"
          }`}
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {toast.type === "warning" && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {saveSuccess && !toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 text-xs font-bold transition-all">
          <CheckCircle2 className="w-4 h-4" />
          <span>Allocation saved successfully!</span>
        </div>
      )}

      {/* In-app Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  confirmModal.isDestructive ? "bg-rose-50 text-rose-600" : "bg-indigo-50 text-indigo-600"
                }`}
              >
                {confirmModal.isDestructive ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <h3 className="text-sm font-bold text-gray-900">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const onConfirm = confirmModal.onConfirm;
                  setConfirmModal(null);
                  onConfirm();
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition cursor-pointer ${
                  confirmModal.isDestructive ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {confirmModal.confirmText || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls Header (Image 3 Parity) */}
      <div className="mb-6 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
        <div className="flex items-center">
          <Link
            href="/allocations/fg/combine"
            className="mr-3.5 p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs text-slate-600 hover:text-slate-900"
            title="Back to Allocations"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Allocation Details</h1>
            <p className="text-xs text-slate-500">
              Trip No: <span className="font-bold text-blue-600">{trip?.tripNo}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Draft Outlook Email Button */}
          <button
            type="button"
            onClick={() => setOutlookModalOpen(true)}
            className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Draft Outlook email to requesters"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Draft Outlook Email</span>
          </button>

          {isCompleted ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                <CheckCircle2 className="w-4 h-4 font-bold" />
                <span>Trip {trip?.status === "CLOSED" ? "Closed" : trip?.status === "FINALIZED" ? "Finalized" : "Completed"}</span>
              </span>
              <Link
                href="/reconciliation"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Go to Reconciliation Hub"
              >
                <span>Go to Reconciliation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/pod"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Go to POD Hub"
              >
                <span>Go to POD Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : isDispatched ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Dispatched</span>
              </span>
              <Link
                href="/reconciliation"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="View in Reconciliation Hub"
              >
                <span>Reconciliation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={handleQuickDispatchComplete}
                disabled={isCompleting || saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Complete this trip: Locks edits, marks requests COMPLETED, and releases vehicle & driver to AVAILABLE"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleting ? "Completing..." : "Complete Trip"}</span>
              </button>
            </div>
          ) : trip?.status === "READY_FOR_LOADING" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Ready for Loading</span>
              </span>
              <button
                type="button"
                onClick={handleQuickDispatchComplete}
                disabled={isCompleting || saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Complete this trip: Locks edits, marks requests COMPLETED, and releases vehicle & driver to AVAILABLE"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleting ? "Completing..." : "Complete Trip"}</span>
              </button>
            </div>
          ) : (
            <>
              {!selectedRouteId && (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-4 h-4 font-bold text-amber-600" />
                  <span>Route Unsaved</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveAllocation}
                disabled={saving || isCompleting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 font-bold" />
                <span>{saving ? "Saving..." : "Save Allocation"}</span>
              </button>
              <button
                type="button"
                onClick={handleQuickDispatchComplete}
                disabled={isCompleting || saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition shadow-sm flex items-center gap-2 cursor-pointer ring-2 ring-emerald-400/20"
                title="Complete Trip: Locks edits, marks requests COMPLETED, and releases vehicle & driver to AVAILABLE"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCompleting ? "Completing..." : "Complete Trip"}</span>
              </button>
              <button
                type="button"
                onClick={handleReverseTrip}
                disabled={saving || isCompleting}
                className="bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold px-3.5 py-2.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Cancel this allocation, revert all requests to SUBMITTED, and release vehicle & driver"
              >
                <RotateCcw className="w-4 h-4 font-bold" />
                <span>Reverse Trip</span>
              </button>
            </>
          )}
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 font-semibold shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have unsaved changes in this combine allocation. Click <strong>Save Allocation</strong> to commit them.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveAllocation}
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            {saving ? "Saving..." : "Save Now"}
          </button>
        </div>
      )}

      {/* 3 Overview KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Trip Info */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Trip Information
              </h3>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                  trip?.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-blue-50 text-blue-700 border border-blue-200"
                }`}
              >
                {trip?.status}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle:</span>
                <span className="font-bold text-slate-800">
                  {trip?.vehicle?.vehicleNumber} ({trip?.vehicle?.vehicleType ?? ""})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Driver:</span>
                <span className="font-bold text-slate-800">{trip?.driver?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Route ID:</span>
                <span
                  className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs tracking-tight cursor-help truncate max-w-[180px]"
                  title={currentRouteName}
                >
                  {currentRouteCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trip Distance:</span>
                <span className="font-bold text-slate-800">{formatNumber(plannedKm, 1)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trip Total Cost:</span>
                <span className="font-bold text-blue-700">
                  Rs. {formatNumber(costBreakdown.total_trip_cost, 2)}
                </span>
              </div>
            </div>
          </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              {trip?.status === "ASSIGNED" && (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100 flex items-center gap-2 text-indigo-800 text-xs">
                  <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-medium text-[11px] leading-tight">
                    Review cargo sequence, then click <strong>Complete Trip</strong> above.
                  </span>
                </div>
              )}

              {isDispatched && (
                <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between gap-2 text-blue-800 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Trip Dispatched</span>
                  </div>
                  <Link
                    href="/reconciliation"
                    className="text-[11px] text-blue-700 hover:underline font-bold"
                  >
                    Reconciliation &rarr;
                  </Link>
                </div>
              )}

              {isCompleted && (
                <Link
                  href="/reconciliation"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>Go to Reconciliation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
        </div>

        {/* 2. Capacity Utilization Widget */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Capacity Utilization
          </h3>

          {(!trip?.vehicle?.maxPayloadKg || !trip?.vehicle?.maxVolumeCbm) && (
            <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
              <span>⚠️ Vehicle capacity specs not registered. Using standard fallback envelope.</span>
            </div>
          )}

          {/* Volume (CBM) Progress */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>
                Volume: {formatNumber(totalCbm, 2)} / {formatNumber(maxVolumeCbm, 2)} CBM
              </span>
              <span className={isCbmOverloaded ? "text-red-600 font-bold" : "text-slate-500"}>
                {pctCbmReal.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className={`${barCbmColor} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${pctCbmDisplay}%` }}
              />
            </div>
          </div>

          {/* Weight (KG) Progress */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs font-bold text-slate-700">
              <span>
                Weight: {formatNumber(totalKg, 1)} / {formatNumber(maxPayloadKg, 1)} KG
              </span>
              <span className={isKgOverloaded ? "text-red-600 font-bold" : "text-slate-500"}>
                {pctKgReal.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
              <div
                className={`${barKgColor} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${pctKgDisplay}%` }}
              />
            </div>
          </div>

          <div className="flex justify-between items-center text-xs font-bold text-slate-600 pt-2 border-t border-slate-100">
            <span>
              Status:{" "}
              <span className={isOverloaded ? "text-red-600 font-bold" : "text-emerald-600 font-bold"}>
                {isOverloaded ? "OVERLOADED" : "SAFE LOAD"}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              {includedRequests.length} requests linked
            </span>
          </div>
        </div>

        {/* 3. Consolidation Cost Savings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <span>Consolidation Savings</span>
              </h3>
              {consolidationSavings.savings_pct > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                  {consolidationSavings.savings_pct}% SAVED
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Standalone Cost (Separate Trips):</span>
                <span className="font-semibold text-slate-700">
                  Rs. {formatNumber(consolidationSavings.standalone_total_cost, 2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Actual Combined Trip Cost:</span>
                <span className="font-semibold text-blue-700">
                  Rs. {formatNumber(consolidationSavings.actual_combined_cost, 2)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                Net Company Savings
              </span>
              <span className="text-[11px] text-emerald-600 font-medium">
                By combining {includedRequests.length} deliveries
              </span>
            </div>
            <span className="text-lg font-bold text-emerald-700">
              Rs. {formatNumber(consolidationSavings.net_savings, 2)}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Panel Grid (50% - 50% split matching PHP and Image 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Add Requests */}
        {isLocked ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 h-[520px] flex flex-col items-center justify-center text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 border shadow-xs ${
              isCompleted ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
            }`}>
              {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <Truck className="w-8 h-8" />}
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {isCompleted ? "Trip Finalized & Completed" : isDispatched ? "Trip Dispatched" : "Ready for Loading"}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {isCompleted
                ? "This allocation is marked as COMPLETED. No additional requests can be added, removed, or transferred."
                : isDispatched
                ? "This trip has been dispatched to the loading bay. Manifest and cargo are locked against alterations."
                : "This allocation is staged for physical loading. Manifest is locked against alterations."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[520px]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800">Add Requests</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">
                  {availableRequests.length} pending
                </span>
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
                  title="Open full-screen expanded allocation workspace"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Expand Workspace</span>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                  <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                    <th className="p-3 font-semibold">Request</th>
                    <th className="p-3 font-semibold">From - To / CBM</th>
                    <th className="p-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {availableRequests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-12 text-center text-slate-400">
                        No pending requests available to load.
                      </td>
                    </tr>
                  ) : (
                    availableRequests.map((r) => {
                      const origin = r.fromLocation?.locationName || r.fromName || r.plant?.code || "-";
                      const dest = r.toLocation?.locationName || r.toName || "-";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition border-b border-slate-50">
                          <td className="p-3 font-bold whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setDetailsModalReq(r)}
                              className="text-indigo-600 font-bold hover:underline block text-left tracking-tight"
                            >
                              {r.requestCode}
                            </button>
                            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {r.plant?.code || "STR"}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="text-slate-800 font-medium">
                              <span>{origin}</span> &rarr; <strong>{dest}</strong>
                            </div>
                            <div className="mt-0.5">
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums">
                                {formatNumber(r.requiredCbm, 2)} CBM
                              </span>
                              <span className="text-[10px] text-slate-500 tabular-nums ml-1.5">
                                {formatNumber(r.requiredKg, 0)} kg &bull; {r.boxCount || 0} bxs
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => handleAddRequest(r)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RIGHT PANEL: Included Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[520px]">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center">
              <Package className="w-4 h-4 mr-2 text-blue-500" />
              <span>Included Requests</span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">
                {includedRequests.length} loaded
              </span>
              <button
                type="button"
                onClick={() => setIsWorkspaceModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 shadow-2xs transition-colors cursor-pointer"
                title="Open full-screen expanded allocation workspace"
              >
                <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Expand Workspace</span>
              </button>
            </div>
          </div>

          {/* Route Banner */}
          <div className="p-3 bg-blue-50/90 border-b border-blue-100 flex items-center gap-2">
            <label className="text-xs font-bold text-blue-800 whitespace-nowrap shrink-0 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Trip Route:</span> <span className="text-rose-500">*</span>
            </label>

            <div className="flex-1 min-w-0">
              <select
                value={selectedRouteId}
                disabled={isLocked}
                onChange={(e) => handleRouteChange(e.target.value)}
                className={`w-full text-xs rounded p-1.5 font-semibold shadow-2xs truncate transition-all ${
                  !selectedRouteId
                    ? "border-2 border-red-500 ring-1 ring-red-500 bg-red-50/30 text-red-700 font-bold focus:ring-red-500"
                    : "border border-blue-200 bg-white text-slate-700 focus:ring-blue-500"
                }`}
                title="Select Trip Route"
              >
                {suggestedRoutes.length > 0 ? (
                  <>
                    <option value="">Select a Route...</option>
                    {suggestedRoutes.map((r) => (
                      <option key={`sug-${r.id}`} value={r.id}>
                        {r.route_name || r.routeName} ({r.route_code || r.routeCode}) - {r.total_distance || r.total_distance_km}km
                      </option>
                    ))}
                  </>
                ) : (
                  <option value="">No matching route found</option>
                )}
              </select>
            </div>

            {!isLocked && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fetchSuggestedRoutes(includedRequests, true)}
                  title="Refresh Routes (Click after creating new route)"
                  className="bg-white border border-blue-200 text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-1.5 rounded text-xs font-bold shadow-2xs flex items-center justify-center h-[28px] w-[28px] transition cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loadingSuggestions ? "animate-spin text-blue-600" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={handleSaveAllocation}
                  disabled={saving}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-700 shadow-2xs whitespace-nowrap cursor-pointer"
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                {(() => {
                  const fromId = includedRequests[0]?.fromLocationId || includedRequests[0]?.from_location_id || "";
                  const toIds = Array.from(new Set(includedRequests.map((r) => r.toLocationId || r.to_location_id).filter(Boolean))).join(",");
                  const isMissing = suggestedRoutes.length === 0 && !selectedRouteId;
                  return (
                    <a
                      href={isMissing ? `/routes/create?origin_id=${fromId}&stop_ids=${toIds}&return_to=allocation` : "/routes/create"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs font-bold flex items-center whitespace-nowrap px-2.5 py-1.5 rounded shadow-2xs transition cursor-pointer ${
                        isMissing
                          ? "text-amber-700 bg-amber-50 border border-amber-300 hover:bg-amber-100"
                          : "text-blue-600 bg-white border border-blue-200 hover:bg-blue-50"
                      }`}
                      title={isMissing ? "Create matching corridor route in Route Master" : "Create new route in Route Master"}
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 text-current" />
                      <span>New Route</span>
                    </a>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Table */}
          <div className="overflow-y-auto flex-1 custom-scrollbar p-0">
            <table className="w-full text-left border-collapse min-w-max">
              <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                <tr className="text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="p-3 font-semibold text-center w-28">Loading Order</th>
                  <th className="p-3 font-semibold">Request</th>
                  <th className="p-3 font-semibold">From - To</th>
                  <th className="p-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {includedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400">
                      No requests included in this trip yet. Click "+ Add" on the left panel to load cargo.
                    </td>
                  </tr>
                ) : (
                  includedRequests.map((req, idx) => {
                    const tag = getLoadingTag(idx, includedRequests.length);
                    const isDoor = tag.includes("Door Loading");
                    const isFirst = tag.includes("1st Loading");
                    const origin = req.fromLocation?.locationName || req.fromName || req.plant?.code || "-";
                    const dest = req.toLocation?.locationName || req.toName || "-";

                    return (
                      <tr
                        key={req.id}
                        draggable={!isLocked}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`transition-colors border-b border-slate-50 ${
                          draggedIdx === idx
                            ? "opacity-30 bg-slate-100"
                            : dragOverIdx === idx
                            ? "bg-blue-50 border-t-2 border-blue-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        {/* Loading Order */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isDoor
                                   ? "bg-amber-50 text-amber-800 border-amber-300"
                                   : isFirst
                                   ? "bg-blue-50 text-blue-700 border-blue-200"
                                   : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {tag}
                            </span>
                            {!isLocked && (
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveUp(idx)}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                  title="Move Up (Pack Deeper)"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === includedRequests.length - 1}
                                  onClick={() => moveDown(idx)}
                                  className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                  title="Move Down (Pack Near Door)"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Request */}
                        <td className="p-3 whitespace-nowrap font-bold">
                          <button
                            type="button"
                            onClick={() => setDetailsModalReq(req)}
                            className="text-indigo-600 font-bold hover:underline block text-left tracking-tight"
                          >
                            {req.requestCode}
                          </button>
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                            {req.invoiceNumbers || "No Invoices"}
                          </div>
                        </td>

                        {/* From - To */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="text-slate-800 font-medium">
                            <strong className="text-slate-900">{req.plant?.code || "STR"}</strong>:{" "}
                            <span>{origin}</span> &rarr; <strong>{dest}</strong>
                          </div>
                          <div className="mt-0.5">
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums">
                              {formatNumber(req.requiredCbm, 2)} CBM
                            </span>
                            <span className="text-[10px] text-slate-500 tabular-nums ml-1.5">
                              {formatNumber(req.requiredKg, 0)} kg &bull; {req.boxCount || 0} bxs
                            </span>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="p-3 text-right whitespace-nowrap">
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRequest(req)}
                              className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer"
                              title="Remove from Trip"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Request Details Modal */}
      {detailsModalReq && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    Request Specs: {detailsModalReq.requestCode}
                  </h3>
                  <p className="text-xs text-gray-500">Logistics and cargo details for allocation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalReq(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50/80 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Plant</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {detailsModalReq.plant?.code || detailsModalReq.plant?.name || "STR"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">
                    Requester
                  </span>
                  <span className="font-bold text-gray-800 text-sm">
                    {detailsModalReq.requester?.name || detailsModalReq.requesterName || "User"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl border border-gray-100 bg-white">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Origin</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {detailsModalReq.fromLocation?.locationName || detailsModalReq.fromName || "-"}
                  </span>
                </div>
                <div className="p-3 rounded-xl border border-gray-100 bg-white">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">
                    Destination
                  </span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {detailsModalReq.toLocation?.locationName || detailsModalReq.toName || "-"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 p-3.5 bg-indigo-50/50 rounded-xl tabular-nums text-center border border-indigo-100/50">
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold font-sans">
                    Boxes
                  </span>
                  <strong className="text-gray-800 text-base">{detailsModalReq.boxCount || 0}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold font-sans">
                    Weight
                  </span>
                  <strong className="text-gray-800 text-base">
                    {formatNumber(detailsModalReq.requiredKg, 0)} kg
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] uppercase font-bold font-sans">
                    Volume
                  </span>
                  <strong className="text-indigo-700 text-base">
                    {formatNumber(detailsModalReq.requiredCbm, 2)} cbm
                  </strong>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">Invoices</span>
                <span className="font-medium text-gray-700 tabular-nums bg-gray-50 px-3 py-2 rounded-xl block border border-gray-100">
                  {detailsModalReq.invoiceNumbers || "None specified"}
                </span>
              </div>

              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold mb-1">
                  Item Description
                </span>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {detailsModalReq.itemDescription || "Finished Goods"}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailsModalReq(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Transfer Request to Another Active Trip Modal */}
      {transferModalReq && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Transfer Cargo to Another Trip</h3>
                  <p className="text-xs text-gray-500">Reassign request cargo manifest to an ongoing vehicle route</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTransferModalReq(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 space-y-1.5">
                <div className="flex justify-between font-bold text-indigo-700 tracking-tight text-sm">
                  <span>{transferModalReq.requestCode}</span>
                  <span className="text-gray-600 font-sans text-xs tabular-nums">
                    {formatNumber(transferModalReq.requiredKg, 0)} kg &bull;{" "}
                    {formatNumber(transferModalReq.requiredCbm, 2)} cbm
                  </span>
                </div>
                <div className="text-gray-600 text-xs">
                  Dest:{" "}
                  <strong>
                    {transferModalReq.toLocation?.locationName || transferModalReq.toName}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Select Target Active Trip <span className="text-rose-500">*</span>
                </label>
                {activeTargetTrips.length === 0 ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                    No other active trips found to receive this load. Create another combine trip
                    first.
                  </div>
                ) : (
                  <select
                    required
                    value={targetTripId}
                    onChange={(e) => setTargetTripId(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose destination trip --</option>
                    {activeTargetTrips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.tripNo} &bull; {t.vehicle?.vehicleNumber} ({t.driver?.name}) &bull;{" "}
                        {t.route?.routeName || "Corridor"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTransferModalReq(null)}
                  className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetTripId || isTransferring}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {isTransferring ? "Transferring..." : "Confirm Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Outlook Email Draft Modal */}
      {outlookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
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
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {mailTemplates.map((tpl) => (
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
                        includedRequests
                          .map((r) => r.requester?.email)
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
                    onClick={handleCopySubject}
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
                    onClick={handleCopyBody}
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
                  Array.from(new Set(includedRequests.map((r) => r.requester?.email).filter(Boolean))).join(";") || "logistics@str.com"
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

      {/* FULL-SCREEN 2-STACKED CARGO ALLOCATION WORKSPACE MODAL */}
      {isWorkspaceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-7xl h-[95vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between gap-4 shrink-0 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <Combine className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                      Cargo Allocation Workspace: <span className="text-indigo-300">{trip?.tripNo}</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-indigo-300 border border-slate-700">
                      {trip?.status || "ASSIGNED"}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      Vehicle: <strong className="text-white font-bold">{trip?.vehicle?.vehicleNumber || "-"}</strong> ({trip?.vehicle?.vehicleType || "-"})
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-xs text-slate-300 font-medium">
                      Driver: <strong className="text-white">{trip?.driver?.name || "-"}</strong>
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span
                      className="text-xs text-indigo-200 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700 cursor-help"
                      title={currentRouteName}
                    >
                      Route ID: {currentRouteCode}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Full-view cargo combine hub. Add or remove requests and review multi-destination loading sequence.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isLocked ? (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                    isCompleted
                      ? "text-emerald-800 bg-emerald-50 border-emerald-300"
                      : "text-blue-800 bg-blue-50 border-blue-300"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                    <span>{isCompleted ? "Trip Completed (Locked)" : isDispatched ? "Dispatched (Locked)" : "Loading Bay (Locked)"}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveAllocation}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Saving..." : "Save Changes"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                  title="Close Workspace"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body - 2 Vertically Stacked Panels */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/60 custom-scrollbar">
              {/* TOP PANEL: 1. Add Requests (Available Pending Pool) */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3.5 sm:px-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        Add Requests (Available Pending Pool)
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Pending delivery requests ready to be loaded into this trip ({availableRequests.length} available)
                      </p>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative min-w-[240px] sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={workspaceSearch}
                      onChange={(e) => setWorkspaceSearch(e.target.value)}
                      placeholder="Search code, plant, destination..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead className="sticky top-0 bg-white z-10 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        <th className="p-3">Request</th>
                        <th className="p-3">Pickup Origin &amp; Address</th>
                        <th className="p-3">Delivery Destination &amp; Customer</th>
                        <th className="p-3 text-right">Cargo Weight</th>
                        <th className="p-3 text-right">Volume</th>
                        <th className="p-3 text-right">Boxes</th>
                        <th className="p-3">Fleet Spec</th>
                        <th className="p-3">Invoices</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {filteredWorkspaceAvailable.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                            {workspaceSearch
                              ? "No pending requests matched your search."
                              : "No pending requests available to load."}
                          </td>
                        </tr>
                      ) : (
                        filteredWorkspaceAvailable.map((r) => {
                          const origin = r.fromLocation?.locationName || r.fromName || r.plant?.code || "-";
                          const originAddr = r.fromLocation?.address || "";
                          const dest = r.toLocation?.locationName || r.toName || "-";
                          const destAddr = r.toLocation?.address || "";

                          return (
                            <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setDetailsModalReq(r)}
                                  className="text-indigo-600 font-bold hover:underline block text-left tracking-tight"
                                >
                                  {r.requestCode}
                                </button>
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                  {r.plant?.code || "STR"}
                                </span>
                              </td>

                              <td className="p-3">
                                <p className="font-bold text-slate-800 leading-tight">{origin}</p>
                                {originAddr && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-[180px]" title={originAddr}>
                                    {originAddr}
                                  </p>
                                )}
                              </td>

                              <td className="p-3">
                                <p className="font-bold text-slate-900 leading-tight">{dest}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {r.customerCode && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 rounded">
                                      {r.customerCode}
                                    </span>
                                  )}
                                  {destAddr && (
                                    <span className="text-[11px] text-slate-400 truncate max-w-[180px]" title={destAddr}>
                                      {destAddr}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                                {formatNumber(r.requiredKg, 1)} kg
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10.5px] font-bold tabular-nums">
                                  {formatNumber(r.requiredCbm, 2)} CBM
                                </span>
                              </td>

                              <td className="p-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                                {r.boxCount ?? "-"} bxs
                              </td>

                              <td className="p-3 whitespace-nowrap text-slate-600 text-[11px]">
                                {r.vehicleType?.name || "-"}
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                <span
                                  className="text-[11px] text-slate-500 truncate max-w-[140px] block cursor-help"
                                  title={r.invoiceNumbers || "No invoices specified"}
                                >
                                  {r.invoiceNumbers || "-"}
                                </span>
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleAddRequest(r)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-2xs cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add to Trip</span>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BOTTOM PANEL: 2. Included Requests (Assigned Cargo & Route Selection) */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden flex flex-col">
                <div className="p-3.5 sm:px-5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Included Requests &amp; Multi-Stop Route Selection</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          {includedRequests.length} Loaded
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Adjust loading sequence (1st loading deep inside &rarr; Door loading near tailgate) and select exact corridor route.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-700">
                      Trip Total: {formatNumber(totalKg, 1)} kg &bull; {formatNumber(totalCbm, 2)} CBM
                    </span>
                  </div>
                </div>

                {/* Corridor Route Selector Inside Workspace */}
                <div className="p-3.5 bg-blue-50/90 border-b border-blue-100 flex flex-col sm:flex-row sm:items-center gap-2.5">
                  <label className="text-xs font-bold text-blue-900 whitespace-nowrap shrink-0 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span>Selected Trip Route:</span> <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedRouteId}
                      disabled={isLocked}
                      onChange={(e) => handleRouteChange(e.target.value)}
                      className={`w-full text-xs rounded-lg p-2 font-semibold shadow-2xs truncate transition-all ${
                        !selectedRouteId
                          ? "border-2 border-red-500 ring-1 ring-red-500 bg-red-50/30 text-red-700 font-bold focus:ring-red-500"
                          : "border border-blue-300 bg-white text-slate-800 focus:ring-2 focus:ring-blue-500"
                      }`}
                      title="Select Trip Route"
                    >
                      {suggestedRoutes.length > 0 ? (
                        <>
                          <option value="">Select a Route...</option>
                          {suggestedRoutes.map((r) => (
                            <option key={`ws-sug-${r.id}`} value={r.id}>
                              {r.route_name || r.routeName} ({r.route_code || r.routeCode}) - {r.total_distance || r.total_distance_km}km
                            </option>
                          ))}
                        </>
                      ) : (
                        <option value="">No matching route found</option>
                      )}
                    </select>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fetchSuggestedRoutes(includedRequests, true)}
                        title="Refresh Routes (Click after creating new route in Route Master)"
                        className="bg-white border border-blue-200 text-blue-600 hover:text-blue-800 hover:bg-blue-100 p-2 rounded-lg text-xs font-bold shadow-2xs flex items-center justify-center transition cursor-pointer"
                      >
                        <RotateCw className={`w-3.5 h-3.5 ${loadingSuggestions ? "animate-spin text-blue-600" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveAllocation}
                        disabled={saving}
                        className="bg-blue-600 text-white px-3.5 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{saving ? "Saving..." : "Save Route"}</span>
                      </button>

                      {(() => {
                        const fromId = includedRequests[0]?.fromLocationId || includedRequests[0]?.from_location_id || "";
                        const toIds = Array.from(new Set(includedRequests.map((r) => r.toLocationId || r.to_location_id).filter(Boolean))).join(",");
                        const isMissing = suggestedRoutes.length === 0 && !selectedRouteId;
                        return (
                          <a
                            href={isMissing ? `/routes/create?origin_id=${fromId}&stop_ids=${toIds}&return_to=allocation` : "/routes/create"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xs font-bold flex items-center whitespace-nowrap px-3 py-2 rounded-lg shadow-2xs transition cursor-pointer ${
                              isMissing
                                ? "text-amber-800 bg-amber-100 border border-amber-300 hover:bg-amber-200"
                                : "text-blue-700 bg-white border border-blue-200 hover:bg-blue-50"
                            }`}
                            title={isMissing ? "Create matching corridor route in Route Master" : "Create new route in Route Master"}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1 text-current" />
                            <span>Create New Route</span>
                          </a>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[950px]">
                    <thead className="sticky top-0 bg-white z-10 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      <tr>
                        <th className="p-3 text-center w-36">Loading Order</th>
                        <th className="p-3">Request</th>
                        <th className="p-3">Pickup Origin</th>
                        <th className="p-3">Delivery Destination</th>
                        <th className="p-3 text-right">Cargo Weight</th>
                        <th className="p-3 text-right">Volume</th>
                        <th className="p-3 text-right">Boxes</th>
                        <th className="p-3">Commercial Invoices</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {includedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                            No requests included in this trip yet. Click &quot;+ Add to Trip&quot; in the panel above to load cargo.
                          </td>
                        </tr>
                      ) : (
                        includedRequests.map((req, idx) => {
                          const tag = getLoadingTag(idx, includedRequests.length);
                          const isDoor = tag.includes("Door Loading");
                          const isFirst = tag.includes("1st Loading");
                          const origin = req.fromLocation?.locationName || req.fromName || req.plant?.code || "-";
                          const originAddr = req.fromLocation?.address || "";
                          const dest = req.toLocation?.locationName || req.toName || "-";
                          const destAddr = req.toLocation?.address || "";

                          return (
                            <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Loading Order */}
                              <td className="p-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      isDoor
                                        ? "bg-amber-50 text-amber-800 border-amber-300"
                                        : isFirst
                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {tag}
                                  </span>
                                  {!isLocked && (
                                    <div className="flex flex-col">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => moveUp(idx)}
                                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                        title="Move Up (Pack Deeper)"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === includedRequests.length - 1}
                                        onClick={() => moveDown(idx)}
                                        className="text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                                        title="Move Down (Pack Near Door)"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => setDetailsModalReq(req)}
                                  className="text-indigo-600 font-bold hover:underline block text-left tracking-tight"
                                >
                                  {req.requestCode}
                                </button>
                                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                  {req.plant?.code || "STR"}
                                </span>
                              </td>

                              <td className="p-3">
                                <p className="font-bold text-slate-800 leading-tight">{origin}</p>
                                {originAddr && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-[180px]" title={originAddr}>
                                    {originAddr}
                                  </p>
                                )}
                              </td>

                              <td className="p-3">
                                <p className="font-bold text-slate-900 leading-tight">{dest}</p>
                                {destAddr && (
                                  <p className="text-[11px] text-slate-400 truncate max-w-[180px]" title={destAddr}>
                                    {destAddr}
                                  </p>
                                )}
                              </td>

                              <td className="p-3 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                                {formatNumber(req.requiredKg, 1)} kg
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded text-[10.5px] font-bold tabular-nums">
                                  {formatNumber(req.requiredCbm, 2)} CBM
                                </span>
                              </td>

                              <td className="p-3 text-right text-slate-700 tabular-nums whitespace-nowrap">
                                {req.boxCount ?? "-"} bxs
                              </td>

                              <td className="p-3 whitespace-nowrap">
                                <span
                                  className="text-[11px] text-slate-600 truncate max-w-[150px] block cursor-help"
                                  title={req.invoiceNumbers || "No invoices specified"}
                                >
                                  {req.invoiceNumbers || "-"}
                                </span>
                              </td>

                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setDetailsModalReq(req)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition cursor-pointer"
                                    title="View Cargo Specifications"
                                  >
                                    Specs
                                  </button>
                                  {!isLocked && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setTransferModalReq(req)}
                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded text-xs transition cursor-pointer"
                                        title="Transfer to another trip"
                                      >
                                        Transfer
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRequest(req)}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded text-xs transition cursor-pointer"
                                        title="Remove from this trip"
                                      >
                                        Remove
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Consolidation Savings</span>
                  <strong className="text-emerald-700 text-sm font-bold">
                    Rs. {formatNumber(consolidationSavings.net_savings, 2)}
                  </strong>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Combined Trip Cost</span>
                  <strong className="text-blue-700 text-sm font-bold">
                    Rs. {formatNumber(costBreakdown.total_trip_cost, 2)}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isLocked && (
                  <button
                    type="button"
                    onClick={handleSaveAllocation}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? "Saving..." : "Save Allocation"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsWorkspaceModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition"
                >
                  Done &amp; Return to Workbench
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
