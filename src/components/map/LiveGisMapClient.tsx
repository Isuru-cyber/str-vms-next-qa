"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Truck,
  Building2,
  MapPin,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  Plus,
  Save,
  X,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface MappedLocation {
  id: number;
  locationName: string;
  locationType: string;
  latitude: number;
  longitude: number;
}

interface ActiveTripMapItem {
  id: number;
  tripNo: string;
  status: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  routeName: string;
  coords: Array<{ lat: number; lng: number; name: string }>;
}

interface ConsolidationPointItem {
  locationId: number;
  locationName: string;
  latitude: number;
  longitude: number;
  requestCount: number;
  totalCbm: number;
  totalKg: number;
}

interface LiveGisMapClientProps {
  mappedLocations: MappedLocation[];
  unmappedLocations: Array<{ id: number; locationName: string }>;
  activeTrips: ActiveTripMapItem[];
  consolidationPoints: ConsolidationPointItem[];
}

export default function LiveGisMapClient({
  mappedLocations,
  unmappedLocations: initialUnmapped,
  activeTrips,
  consolidationPoints,
}: LiveGisMapClientProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layersRef = useRef<{
    trips?: any;
    consolidation?: any;
    locations?: any;
    tempMarker?: any;
  }>({});

  const [showTrips, setShowTrips] = useState(true);
  const [showConsolidation, setShowConsolidation] = useState(true);
  const [showLocations, setShowLocations] = useState(true);

  // Pinning Mode State
  const [unmappedList, setUnmappedList] = useState(initialUnmapped);
  const [selectedUnmappedId, setSelectedUnmappedId] = useState("");
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingCoords, setSavingCoords] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;

    // Dynamically load leaflet
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix icon URLs if any default icons used
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current).setView([6.9271, 79.8612], 9);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map);

        const tripsLayer = L.layerGroup().addTo(map);
        const consolidationLayer = L.layerGroup().addTo(map);
        const locationsLayer = L.layerGroup().addTo(map);

        layersRef.current = {
          trips: tripsLayer,
          consolidation: consolidationLayer,
          locations: locationsLayer,
        };

        mapInstanceRef.current = map;

        // Click on map to place pinning marker
        map.on("click", (e: any) => {
          const lat = parseFloat(e.latlng.lat.toFixed(6));
          const lng = parseFloat(e.latlng.lng.toFixed(6));

          // Place or move temp marker
          if (layersRef.current.tempMarker) {
            map.removeLayer(layersRef.current.tempMarker);
          }

          const pinIcon = L.divIcon({
            className: "custom-div-pin",
            html: `<div style="transform: translate(-50%, -50%);" class="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-xl flex items-center justify-center text-white text-base animate-bounce">📍</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          layersRef.current.tempMarker = L.marker([lat, lng], { icon: pinIcon })
            .addTo(map)
            .bindPopup(`Selected: [${lat}, ${lng}]`)
            .openPopup();

          setPinCoords({ lat, lng });
        });
      }

      // Render Locations Layer
      const locLayer = layersRef.current.locations;
      if (locLayer) {
        locLayer.clearLayers();
        mappedLocations.forEach((loc) => {
          const isPlant = loc.locationType === "PLANT";
          const isWh = loc.locationType === "WAREHOUSE";
          const bg = isPlant ? "bg-indigo-600" : isWh ? "bg-amber-600" : "bg-emerald-600";
          const emoji = isPlant ? "🏭" : isWh ? "📦" : "🏢";

          const icon = L.divIcon({
            className: "custom-loc-icon",
            html: `<div style="transform: translate(-50%, -50%);" class="w-7 h-7 rounded-xl ${bg} text-white flex items-center justify-center text-xs shadow-md border-2 border-white font-bold">${emoji}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          L.marker([loc.latitude, loc.longitude], { icon })
            .addTo(locLayer)
            .bindPopup(
              `<div class="text-xs p-1 font-sans">
                <strong class="text-gray-900 block font-bold">${loc.locationName}</strong>
                <span class="text-gray-500 block uppercase text-[10px] mt-0.5">${loc.locationType}</span>
                <span class="text-indigo-600 font-medium tabular-nums text-[10px] block mt-1">[${loc.latitude}, ${loc.longitude}]</span>
              </div>`
            );
        });
      }

      // Render Consolidation Points Layer
      const conLayer = layersRef.current.consolidation;
      if (conLayer) {
        conLayer.clearLayers();
        consolidationPoints.forEach((cp) => {
          const radius = Math.min(30, Math.max(12, cp.requestCount * 6));
          const circle = L.circleMarker([cp.latitude, cp.longitude], {
            radius,
            color: "#e11d48",
            fillColor: "#f43f5e",
            fillOpacity: 0.6,
            weight: 2,
          }).addTo(conLayer);

          circle.bindPopup(
            `<div class="text-xs p-1 font-sans space-y-1">
              <strong class="text-rose-700 block font-bold">Consolidation Hub</strong>
              <div class="font-bold text-gray-900">${cp.locationName}</div>
              <div class="text-gray-600 text-[11px]">${cp.requestCount} Pending Cargo Requests</div>
              <div class="text-gray-700 text-[11px] font-semibold tabular-nums">${cp.totalKg} KG &bull; ${cp.totalCbm.toFixed(2)} CBM</div>
            </div>`
          );
        });
      }

      // Render Active Trips Layer
      const tripLayer = layersRef.current.trips;
      if (tripLayer) {
        tripLayer.clearLayers();
        activeTrips.forEach((t) => {
          if (t.coords.length > 0) {
            const latLngs: [number, number][] = t.coords.map((c) => [c.lat, c.lng] as [number, number]);
            L.polyline(latLngs, {
              color: "#3b82f6",
              weight: 4,
              opacity: 0.8,
              dashArray: "6, 8",
            }).addTo(tripLayer);

            // Put a truck marker at the first or active point
            const first = t.coords[0];
            const truckIcon = L.divIcon({
              className: "custom-truck-icon",
              html: `<div style="transform: translate(-50%, -50%);" class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm shadow-xl border-2 border-white animate-pulse">🚛</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });

            L.marker([first.lat, first.lng], { icon: truckIcon })
              .addTo(tripLayer)
              .bindPopup(
                `<div class="text-xs p-1 font-sans space-y-1">
                  <strong class="text-blue-700 font-bold tracking-tight">${t.tripNo}</strong>
                  <div class="text-gray-800 font-bold">${t.vehicleNumber} (${t.vehicleType})</div>
                  <div class="text-gray-500">Driver: ${t.driverName}</div>
                  <div class="text-indigo-600 font-semibold">${t.routeName}</div>
                </div>`
              );
          }
        });
      }
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mappedLocations, activeTrips, consolidationPoints]);

  // Toggle Layer visibility
  const handleToggleLayer = (layerName: "trips" | "consolidation" | "locations") => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (layerName === "trips") {
      const next = !showTrips;
      setShowTrips(next);
      if (layersRef.current.trips) {
        if (next) map.addLayer(layersRef.current.trips);
        else map.removeLayer(layersRef.current.trips);
      }
    } else if (layerName === "consolidation") {
      const next = !showConsolidation;
      setShowConsolidation(next);
      if (layersRef.current.consolidation) {
        if (next) map.addLayer(layersRef.current.consolidation);
        else map.removeLayer(layersRef.current.consolidation);
      }
    } else if (layerName === "locations") {
      const next = !showLocations;
      setShowLocations(next);
      if (layersRef.current.locations) {
        if (next) map.addLayer(layersRef.current.locations);
        else map.removeLayer(layersRef.current.locations);
      }
    }
  };

  // Save Coordinates for selected unmapped location
  const handleSaveCoordinates = async () => {
    if (!selectedUnmappedId || !pinCoords) return;
    setSavingCoords(true);

    try {
      const res = await fetch("/api/map/coordinates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUnmappedId,
          lat: pinCoords.lat,
          lng: pinCoords.lng,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast("error", data.message || "Failed to save coordinates.");
        return;
      }

      showToast("success", data.message);
      setUnmappedList(unmappedList.filter((u) => String(u.id) !== selectedUnmappedId));
      setSelectedUnmappedId("");
      setPinCoords(null);

      // Remove temp marker
      if (layersRef.current.tempMarker && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(layersRef.current.tempMarker);
        layersRef.current.tempMarker = null;
      }

      // Reload page to refresh pinned location
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      showToast("error", err.message || "Network error.");
    } finally {
      setSavingCoords(false);
    }
  };

  const selectedLoc = unmappedList.find((u) => String(u.id) === selectedUnmappedId);

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold text-white transition-all ${
            toastMsg.type === "success"
              ? "bg-emerald-600 border border-emerald-500"
              : "bg-rose-600 border border-rose-500"
          }`}
        >
          {toastMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">
            Layers:
          </span>

          <button
            type="button"
            onClick={() => handleToggleLayer("trips")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showTrips
                ? "bg-blue-50 text-blue-700 border-blue-200 shadow-xs"
                : "bg-gray-50 text-gray-500 border-gray-200 opacity-60"
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Active Trips ({activeTrips.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleLayer("consolidation")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showConsolidation
                ? "bg-rose-50 text-rose-700 border-rose-200 shadow-xs"
                : "bg-gray-50 text-gray-500 border-gray-200 opacity-60"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Consolidation Points ({consolidationPoints.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleLayer("locations")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showLocations
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs"
                : "bg-gray-50 text-gray-500 border-gray-200 opacity-60"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Locations ({mappedLocations.length})</span>
          </button>
        </div>

        {/* Pin Location Coordinates Tool */}
        <div className="flex items-center gap-2">
          <select
            value={selectedUnmappedId}
            onChange={(e) => {
              setSelectedUnmappedId(e.target.value);
              setPinCoords(null);
            }}
            className="text-xs border border-gray-300 rounded-xl p-2 bg-white text-gray-800 font-semibold focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Pin Location Coordinates --</option>
            {unmappedList.map((u) => (
              <option key={u.id} value={u.id}>
                📍 {u.locationName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Coordinate Mapping Mode Banner */}
      {selectedLoc && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-200 rounded-lg text-amber-900">
                <MapPin className="w-4 h-4" />
              </span>
              <p className="text-xs font-bold text-amber-900">
                Setting Coordinates for:{" "}
                <span className="text-amber-800 underline font-extrabold">
                  {selectedLoc.locationName}
                </span>
              </p>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              Click anywhere on the map to place the pin, then click "Save Coordinates".
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums font-bold text-amber-900 bg-white border border-amber-200 px-3 py-1.5 rounded-xl shadow-xs">
              {pinCoords ? `[${pinCoords.lat}, ${pinCoords.lng}]` : "Click map to set pin"}
            </span>

            <button
              type="button"
              disabled={!pinCoords || savingCoords}
              onClick={handleSaveCoordinates}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCoords ? "Saving..." : "Save Coordinates"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedUnmappedId("");
                setPinCoords(null);
                if (layersRef.current.tempMarker && mapInstanceRef.current) {
                  mapInstanceRef.current.removeLayer(layersRef.current.tempMarker);
                  layersRef.current.tempMarker = null;
                }
              }}
              className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 text-xs font-semibold cursor-pointer"
              title="Cancel Pinning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Map Canvas */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden relative">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapContainerRef} className="w-full h-[650px] z-0" />
      </div>
    </div>
  );
}
