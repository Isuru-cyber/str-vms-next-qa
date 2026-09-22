"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Truck, User, Compass, Layers } from "lucide-react";

interface VehicleOption {
  id: number;
  vehicleNumber: string;
  vehicleType: string;
}

interface DriverOption {
  id: number;
  name: string;
  mobile: string;
  linkedVehicleId?: number | null;
}

interface RouteOption {
  id: number;
  routeName: string;
  routeCode: string;
  totalDistanceKm: number | string | null;
}

interface CreateCombineTripModalProps {
  vehicles: VehicleOption[];
  drivers: DriverOption[];
  routes: RouteOption[];
}

export const CreateCombineTripModal: React.FC<CreateCombineTripModalProps> = ({
  vehicles,
  drivers,
  routes,
}) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleOpen = () => {
    setVehicleId("");
    setDriverId("");
    setRouteId("");
    setAdminRemarks("");
    setError("");
    setIsOpen(true);
  };

  const handleVehicleChange = (vId: string) => {
    setVehicleId(vId);
    if (vId) {
      const linked = drivers.find((d) => Number(d.linkedVehicleId) === Number(vId));
      if (linked) {
        setDriverId(String(linked.id));
      }
    }
  };

  const isDriverAutoSelected = useMemo(() => {
    if (!vehicleId || !driverId) return false;
    const linked = drivers.find((d) => Number(d.linkedVehicleId) === Number(vehicleId));
    return linked ? String(linked.id) === String(driverId) : false;
  }, [vehicleId, driverId, drivers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId || !driverId) {
      setError("Please select both a vehicle and driver.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/allocations/combine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-empty",
          vehicleId,
          driverId,
          routeId: routeId || null,
          adminRemarks,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to create combine trip.");
        setIsSubmitting(false);
        return;
      }

      setIsOpen(false);
      router.push(`/allocations/fg/combine/${data.trip.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Create Combine Trip</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Initialize Combine Trip</h3>
                  <p className="text-xs text-gray-500">Assign initial fleet vehicle and driver to start grouping requests</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Assign Fleet Vehicle *
                </label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Select Available Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} ({v.vehicleType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block font-semibold text-gray-700">
                    Assign Driver *
                  </label>
                  {isDriverAutoSelected && (
                    <span className="text-[10.5px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Auto-assigned
                    </span>
                  )}
                </div>
                <select
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Select Available Driver --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Initial Route Corridor (Optional)
                </label>
                <select
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Auto Corridor / Custom Stops --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeCode} - {r.routeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Dispatcher Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or consolidation notes..."
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Initializing..." : "Create & Open Workbench"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
