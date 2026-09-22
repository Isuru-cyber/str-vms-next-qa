'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Route as RouteIcon,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  X,
  Gauge,
  MapPin,
  Flag,
} from 'lucide-react';

interface LocationItem {
  id: number;
  locationName: string;
  businessGroup?: string;
  locationType?: string;
  isOrigin?: number;
}

interface OperationItem {
  id: number;
  code: string;
  name: string;
}

interface StopRow {
  id: string;
  locationId: string;
  cumulativeDistanceKm: string;
  isDirectLocked?: boolean;
  directRouteCode?: string;
}

interface RouteCreatePageClientProps {
  locations: LocationItem[];
  operations: OperationItem[];
  defaultRouteCode: string;
  initialOriginId?: string;
  initialStopIds?: string;
  initialBg?: string;
  returnTo?: string;
}

const TYPE_ORDER = ['PLANT', 'WAREHOUSE', 'CUSTOMER', 'SUPPLIER', 'INTERNAL', 'OTHER'];
const TYPE_LABELS: Record<string, string> = {
  PLANT: 'PLANTS',
  WAREHOUSE: 'WAREHOUSES',
  CUSTOMER: 'CUSTOMERS',
  SUPPLIER: 'SUPPLIERS',
  INTERNAL: 'INTERNAL / OTHER',
  OTHER: 'OTHER LOCATIONS',
};

export function RouteCreatePageClient({
  locations,
  operations,
  defaultRouteCode,
  initialOriginId = '',
  initialStopIds = '',
  initialBg = '',
  returnTo = '',
}: RouteCreatePageClientProps) {
  const router = useRouter();

  // Determine initial origin: from URL or first origin location
  const defaultOrigin =
    initialOriginId ||
    locations.find((l) => l.isOrigin === 1)?.id?.toString() ||
    locations[0]?.id?.toString() ||
    '';

  const [originLocationId, setOriginLocationId] = useState<string>(defaultOrigin);
  const [routeCode, setRouteCode] = useState<string>(defaultRouteCode);
  const [routeName, setRouteName] = useState<string>('');
  const [businessGroup, setBusinessGroup] = useState<string>(initialBg || 'ELASTIC');
  const [operationType, setOperationType] = useState<string>('FG_OTHER');
  const [totalDistanceKm, setTotalDistanceKm] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [active, setActive] = useState<boolean>(true);

  // Stops list
  const [stops, setStops] = useState<StopRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [createdRoute, setCreatedRoute] = useState<any>(null);

  // Group locations for select optgroups
  const groupedLocations = locations.reduce<Record<string, LocationItem[]>>((acc, loc) => {
    const t = (loc.locationType || 'OTHER').toUpperCase();
    if (!acc[t]) acc[t] = [];
    acc[t].push(loc);
    return acc;
  }, {});

  // Initialize stops from URL stop_ids
  useEffect(() => {
    if (initialStopIds) {
      const ids = initialStopIds.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        const newStops: StopRow[] = ids.map((id, idx) => ({
          id: `stop-${Date.now()}-${idx}`,
          locationId: id,
          cumulativeDistanceKm: '',
        }));
        setStops(newStops);

        // Fetch distances for these stops
        newStops.forEach((stop, idx) => {
          if (defaultOrigin && stop.locationId) {
            fetchStopDistance(defaultOrigin, stop.locationId, (dist, isDirect, code) => {
              setStops((prev) => {
                const next = [...prev];
                if (next[idx]) {
                  next[idx] = {
                    ...next[idx],
                    cumulativeDistanceKm: dist ? String(dist) : '',
                    isDirectLocked: isDirect,
                    directRouteCode: code,
                  };
                }
                return next;
              });
            });
          }
        });
      }
    } else {
      // Default: 1 empty stop
      setStops([
        {
          id: `stop-${Date.now()}-0`,
          locationId: '',
          cumulativeDistanceKm: '',
        },
      ]);
    }
  }, [initialStopIds]);

  // Compute Route Name chain whenever origin or stops change
  useEffect(() => {
    const originLoc = locations.find((l) => String(l.id) === String(originLocationId));
    const parts: string[] = [];
    if (originLoc) parts.push(originLoc.locationName);

    stops.forEach((s) => {
      if (s.locationId) {
        const dest = locations.find((l) => String(l.id) === String(s.locationId));
        if (dest) parts.push(dest.locationName);
      }
    });

    if (parts.length > 0) {
      setRouteName(parts.join(' -> '));
    }
  }, [originLocationId, stops, locations]);

  // Suggest distance helper
  const fetchStopDistance = async (
    originId: string,
    destId: string,
    callback?: (dist: number | null, isDirect: boolean, code?: string) => void
  ) => {
    if (!originId || !destId) return;
    try {
      const res = await fetch(
        `/api/routes/suggest-distance?origin_id=${originId}&location_id=${destId}`
      );
      const data = await res.json();
      if (data.success && data.distance_km) {
        if (callback) {
          callback(data.distance_km, !!data.is_direct, data.route_code);
        }
      } else {
        if (callback) callback(null, false);
      }
    } catch {
      if (callback) callback(null, false);
    }
  };

  // Handle Origin Change
  const handleOriginChange = (newOriginId: string) => {
    setOriginLocationId(newOriginId);
    const originLoc = locations.find((l) => String(l.id) === String(newOriginId));
    if (originLoc?.businessGroup) {
      setBusinessGroup(originLoc.businessGroup.toUpperCase());
    }

    // Re-check distance for all stops
    stops.forEach((s, idx) => {
      if (s.locationId) {
        fetchStopDistance(newOriginId, s.locationId, (dist, isDirect, code) => {
          setStops((prev) => {
            const next = [...prev];
            if (next[idx]) {
              next[idx] = {
                ...next[idx],
                cumulativeDistanceKm: dist ? String(dist) : next[idx].cumulativeDistanceKm,
                isDirectLocked: isDirect,
                directRouteCode: code,
              };
            }
            return next;
          });
        });
      }
    });
  };

  // Add a stop
  const addStop = () => {
    setStops((prev) => [
      ...prev,
      {
        id: `stop-${Date.now()}-${prev.length}`,
        locationId: '',
        cumulativeDistanceKm: '',
      },
    ]);
  };

  // Remove a stop
  const removeStop = (idx: number) => {
    setStops((prev) => prev.filter((_, i) => i !== idx));
  };

  // Move stop up / down
  const moveStop = (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= stops.length) return;
    setStops((prev) => {
      const next = [...prev];
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  // Handle Stop Location Change
  const handleStopLocationChange = (idx: number, locId: string) => {
    setStops((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], locationId: locId };
      return next;
    });

    if (originLocationId && locId) {
      fetchStopDistance(originLocationId, locId, (dist, isDirect, code) => {
        setStops((prev) => {
          const next = [...prev];
          if (next[idx]) {
            next[idx] = {
              ...next[idx],
              cumulativeDistanceKm: dist ? String(dist) : '',
              isDirectLocked: isDirect,
              directRouteCode: code,
            };
          }
          return next;
        });
      });
    }
  };

  // Manual Sparkle Auto-Find Distance
  const handleSuggestStopDistance = (idx: number) => {
    const s = stops[idx];
    if (!originLocationId || !s.locationId) {
      alert('Please select both Origin and Destination Stop first.');
      return;
    }
    fetchStopDistance(originLocationId, s.locationId, (dist, isDirect, code) => {
      if (dist) {
        setStops((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            cumulativeDistanceKm: String(dist),
            isDirectLocked: isDirect,
            directRouteCode: code,
          };
          return next;
        });
      } else {
        alert('No existing route distance recorded for this pair. Please enter the direct distance manually.');
      }
    });
  };

  // Auto-calculate sum of all stop distances
  const handleAutoSumStopsKm = () => {
    const sum = stops.reduce((acc, s) => {
      const d = parseFloat(s.cumulativeDistanceKm);
      return acc + (!isNaN(d) && d > 0 ? d : 0);
    }, 0);
    if (sum === 0) {
      alert('Please enter or suggest distance for at least one stop first.');
      return;
    }
    const rounded = Math.round(sum * 10) / 10;
    setTotalDistanceKm(String(rounded));
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!originLocationId) {
      setErrorMessage('Origin location is required.');
      return;
    }

    if (stops.length === 0 || !stops.some((s) => s.locationId)) {
      setErrorMessage('Please add at least one delivery destination stop.');
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (!s.locationId) {
        setErrorMessage(`Please select a destination location for Stop ${i + 1}.`);
        return;
      }
      const km = parseFloat(s.cumulativeDistanceKm);
      if (isNaN(km) || km <= 0) {
        setErrorMessage(`Please enter a valid direct distance (KM > 0) for Stop ${i + 1}.`);
        return;
      }
    }

    const totalKm = parseFloat(totalDistanceKm);
    if (isNaN(totalKm) || totalKm <= 0) {
      setErrorMessage('Please enter the Total Route Distance (Round Trip KM > 0).');
      return;
    }

    if (!routeName.trim()) {
      setErrorMessage('Route name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeCode: routeCode.trim().toUpperCase(),
          routeName: routeName.trim(),
          businessGroup,
          operationType,
          originLocationId: parseInt(originLocationId, 10),
          totalDistanceKm: totalKm,
          remarks,
          active: active ? 1 : 0,
          stops: stops.map((s) => ({
            locationId: s.locationId,
            cumulativeDistanceKm: s.cumulativeDistanceKm,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to create route.');
      }

      setCreatedRoute(json.data);
      setSuccessMessage(`Route ${json.data?.routeCode || routeCode} created and synchronized successfully!`);

      // If opened in popup or from allocation tab, broadcast message
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('STR_ROUTE_CREATED_TS', Date.now().toString());
          if (window.opener) {
            window.opener.postMessage(
              { type: 'ROUTE_CREATED', route: json.data },
              '*'
            );
          }
        } catch {}
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while creating route.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 pb-16 px-3 sm:px-6">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <RouteIcon className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">
              New Route & Multi-Stop Sequencing
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {returnTo === 'allocation' && (
            <button
              type="button"
              onClick={() => window.close()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Tab</span>
            </button>
          )}
          <Link
            href="/routes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Routes Register</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold text-emerald-900">{successMessage}</p>
              <p className="text-[11px] text-emerald-700 font-normal mt-0.5">
                The corridor route is now active and available for instant allocation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {returnTo === 'allocation' && (
              <button
                type="button"
                onClick={() => window.close()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
              >
                Close & Return to Allocation
              </button>
            )}
            <Link
              href="/routes"
              className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-colors"
            >
              View in Routes Register
            </Link>
          </div>
        </div>
      )}

      {/* Main 2-Column Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: 1. Journey Route & Stops Sequence (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <RouteIcon className="w-4 h-4 text-indigo-600" />
                  <span>1. Journey Route & Stops Sequence</span>
                </h2>
              </div>

              {/* 1. Origin Location */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Origin Location (Start Hub)</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Start
                  </span>
                </label>
                <select
                  required
                  value={originLocationId}
                  onChange={(e) => handleOriginChange(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                >
                  <option value="">-- Select Origin Location --</option>
                  {TYPE_ORDER.map((t) => {
                    const group = groupedLocations[t];
                    if (!group || group.length === 0) return null;
                    return (
                      <optgroup key={t} label={TYPE_LABELS[t] || t}>
                        {group.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.locationName}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              {/* 2. Delivery Stops Sequence */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Delivery Stops (Destinations & Direct KM from Origin)</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Stops with an existing Direct Route have standard KM locked automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addStop}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Stop</span>
                  </button>
                </div>

                {/* Stops Rows */}
                <div className="space-y-2">
                  {stops.map((stop, idx) => (
                    <div
                      key={stop.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-slate-50/70 p-3 border border-slate-200 rounded-xl shadow-2xs hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Order Controls */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveStop(idx, -1)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === stops.length - 1}
                            onClick={() => moveStop(idx, 1)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Stop Badge */}
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md shrink-0">
                          Stop {idx + 1}
                        </span>

                        {/* Destination Location Dropdown */}
                        <select
                          required
                          value={stop.locationId}
                          onChange={(e) => handleStopLocationChange(idx, e.target.value)}
                          className="flex-1 min-w-0 text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                        >
                          <option value="">-- Select Destination Stop --</option>
                          {TYPE_ORDER.map((t) => {
                            const group = groupedLocations[t];
                            if (!group || group.length === 0) return null;
                            return (
                              <optgroup key={t} label={TYPE_LABELS[t] || t}>
                                {group.map((loc) => (
                                  <option key={loc.id} value={loc.id}>
                                    {loc.locationName}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </div>

                      {/* Distance & Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                        {/* Direct KM Input */}
                        <div className="relative w-36 sm:w-40 shrink-0">
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            required
                            readOnly={stop.isDirectLocked}
                            value={stop.cumulativeDistanceKm}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStops((prev) => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], cumulativeDistanceKm: val };
                                return next;
                              });
                            }}
                            placeholder="Direct KM"
                            className={`w-full text-xs font-bold tabular-nums pl-3.5 pr-8 py-2 rounded-xl border shadow-2xs transition-all ${
                              stop.isDirectLocked
                                ? 'bg-slate-100 text-slate-700 border-slate-300 cursor-not-allowed font-black'
                                : 'bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'
                            }`}
                            title="Distance from Origin to this Stop in KM (Required)"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            KM
                          </span>
                        </div>

                        {/* Direct Route Lock Badge */}
                        {stop.isDirectLocked && stop.directRouteCode && (
                          <span
                            className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-1 rounded flex items-center gap-0.5 shrink-0"
                            title={`Locked from Direct Route ${stop.directRouteCode}`}
                          >
                            <Lock className="w-3 h-3 text-indigo-600" />
                            <span>{stop.directRouteCode}</span>
                          </span>
                        )}

                        {/* Sparkle Suggest Distance */}
                        {!stop.isDirectLocked && (
                          <button
                            type="button"
                            onClick={() => handleSuggestStopDistance(idx)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-indigo-600 transition-colors shrink-0 cursor-pointer"
                            title="Auto-find known distance from Origin"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Stop */}
                        {stops.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeStop(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Remove Stop"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Total Route Distance (Final KM - Up & Down / Round Trip KM) */}
              <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 border border-blue-200 rounded-xl p-4 shadow-2xs space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-blue-600" />
                    <span>Total Route Distance (Final KM - Up & Down)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoSumStopsKm}
                      className="text-[10px] text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded font-bold transition-colors cursor-pointer"
                      title="Auto-sum direct distances of all stops"
                    >
                      ∑ Auto Sum Stops KM
                    </button>
                    <span className="text-[10px] text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      Round Trip KM
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={totalDistanceKm}
                    onChange={(e) => setTotalDistanceKm(e.target.value)}
                    placeholder="e.g. 185.0"
                    className="w-full text-xs font-bold tabular-nums text-blue-950 placeholder:text-slate-400 placeholder:font-normal pl-3.5 pr-12 py-2.5 bg-white border border-blue-300 rounded-xl focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-blue-600 pointer-events-none">
                    KM
                  </span>
                </div>

                <p className="text-[10.5px] text-slate-500">
                  Enter the total route distance for this trip. Vehicle rates and driver payouts calculate from this total, while each stop&apos;s direct KM is used to calculate standalone consolidation savings.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: 2. Route Profile & Settings (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 space-y-4">
              <div className="border-b border-slate-100 pb-2.5">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-indigo-600" />
                  <span>2. Route Profile & Settings</span>
                </h2>
              </div>

              {/* Route Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Route Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={routeCode}
                  onChange={(e) => setRouteCode(e.target.value.toUpperCase())}
                  placeholder="e.g. RTE-0050"
                  className="w-full text-xs font-bold tabular-nums bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase tracking-wide text-slate-800 shadow-2xs"
                />
              </div>

              {/* Route Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Route Name <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Auto-generates</span>
                </div>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. STR 1 - BIYAGAMA -> HORANA BODYLINE"
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-2xs"
                />
              </div>

              {/* Business Group & Operation Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Business Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={businessGroup}
                    onChange={(e) => setBusinessGroup(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-2xs"
                  >
                    <option value="ELASTIC">Elastic</option>
                    <option value="YARN">Yarn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operation Type
                  </label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-2xs"
                  >
                    <option value="">-- Any Operation --</option>
                    {operations.map((op) => (
                      <option key={op.id} value={op.code}>
                        {op.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Route Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Route Remarks
                </label>
                <textarea
                  rows={3}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Transit instructions, highway notes, gate restrictions..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 shadow-2xs"
                />
              </div>

              {/* Active Route */}
              <div className="pt-2 border-t border-slate-100 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-slate-700">Active Corridor Route</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
          <button
            type="button"
            onClick={() => {
              if (returnTo === 'allocation' && typeof window !== 'undefined') {
                window.close();
              } else {
                router.push('/routes');
              }
            }}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving Route...' : 'Save Corridor Route'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
