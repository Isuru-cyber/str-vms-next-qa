'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Filter,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency } from '@/lib/utils';

interface VehicleRegistryProps {
  initialVehicles: any[];
  locations?: any[];
  operations?: any[];
  vehicleTypes?: any[];
}

export function VehicleRegistry({
  initialVehicles = [],
  locations = [],
  operations = [],
  vehicleTypes = [],
}: VehicleRegistryProps) {
  const router = useRouter();
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [search, setSearch] = useState('');
  const [basisFilter, setBasisFilter] = useState<'ALL' | 'KM_BASED' | 'FIXED' | 'ADHOC'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);

  // Form Fields matching PHP Vehicle Master
  const [vNumber, setVNumber] = useState('');
  const [vType, setVType] = useState('10 ft');
  const [operationCategoryId, setOperationCategoryId] = useState<string>('');
  const [defaultLocationId, setDefaultLocationId] = useState<string>('');
  const [payloadKg, setPayloadKg] = useState('2000.00');
  const [volumeCbm, setVolumeCbm] = useState('15.00');
  const [basis, setBasis] = useState('KM_BASED');
  const [status, setStatus] = useState('AVAILABLE');

  // Fixed Parameters
  const [monthlyRent, setMonthlyRent] = useState('314109.73');
  const [limitKm, setLimitKm] = useState('1000');
  const [extraRate, setExtraRate] = useState('113.44');

  // KM-Based Parameters
  const [kml, setKml] = useState('10.0');
  const [runningCost, setRunningCost] = useState('20.50');
  const [profitKm, setProfitKm] = useState('15.00');
  const [fixedPerDay, setFixedPerDay] = useState('1795.36');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVehicleTypeChange = (selectedName: string) => {
    setVType(selectedName);
    const matched = vehicleTypes.find(
      (vt: any) => vt.name?.toLowerCase() === selectedName.toLowerCase() || vt.code?.toLowerCase() === selectedName.toLowerCase()
    );
    if (matched) {
      if (matched.defaultFuelConsumption !== null && matched.defaultFuelConsumption !== undefined) {
        setKml(String(matched.defaultFuelConsumption));
      }
      if (matched.defaultRunningCostPerKm !== null && matched.defaultRunningCostPerKm !== undefined) {
        setRunningCost(String(matched.defaultRunningCostPerKm));
      }
      if (matched.defaultProfitPerKm !== null && matched.defaultProfitPerKm !== undefined) {
        setProfitKm(String(matched.defaultProfitPerKm));
      }
      if (matched.defaultFixedCostPerDay !== null && matched.defaultFixedCostPerDay !== undefined) {
        setFixedPerDay(String(matched.defaultFixedCostPerDay));
      }
    }
  };

  const openAdd = () => {
    setEditingVehicle(null);
    setVNumber('');
    const defaultType = vehicleTypes[0]?.name || '10 ft';
    setVType(defaultType);
    setOperationCategoryId(operations[0]?.id ? String(operations[0].id) : '');
    setDefaultLocationId(locations[0]?.id ? String(locations[0].id) : '');
    setPayloadKg('2000.00');
    setVolumeCbm('15.00');
    setBasis('KM_BASED');
    setStatus('AVAILABLE');

    // Default Fixed values
    setMonthlyRent('314109.73');
    setLimitKm('1000');
    setExtraRate('113.44');

    // Default KM values from selected vehicle type or fallback
    const matched = vehicleTypes.find((vt: any) => vt.name === defaultType);
    if (matched) {
      setKml(matched.defaultFuelConsumption ? String(matched.defaultFuelConsumption) : '10.0');
      setRunningCost(matched.defaultRunningCostPerKm ? String(matched.defaultRunningCostPerKm) : '20.50');
      setProfitKm(matched.defaultProfitPerKm ? String(matched.defaultProfitPerKm) : '15.00');
      setFixedPerDay(matched.defaultFixedCostPerDay ? String(matched.defaultFixedCostPerDay) : '1795.36');
    } else {
      setKml('10.0');
      setRunningCost('20.50');
      setProfitKm('15.00');
      setFixedPerDay('1795.36');
    }

    setIsModalOpen(true);
  };

  const openEdit = (v: any) => {
    setEditingVehicle(v);
    setVNumber(v.vehicleNumber || '');
    setVType(v.vehicleType || '14.5 ft');
    setOperationCategoryId(v.operationCategoryId ? String(v.operationCategoryId) : (v.operationCategory?.id ? String(v.operationCategory.id) : ''));
    setDefaultLocationId(v.defaultLocationId ? String(v.defaultLocationId) : (v.defaultLocation?.id ? String(v.defaultLocation.id) : ''));
    setPayloadKg(String(v.maxPayloadKg || '2000.00'));
    setVolumeCbm(String(v.maxVolumeCbm || '15.00'));
    const isAdhoc = v.ownershipType === 'ADHOC' || v.paymentBasis === 'ADHOC';
    setBasis(isAdhoc ? 'ADHOC' : (v.paymentBasis === 'FIXED' ? 'FIXED' : 'KM_BASED'));
    setStatus(v.status || 'AVAILABLE');

    setMonthlyRent(String(v.monthlyFixedRate || '0'));
    setLimitKm(String(v.monthlyKmLimit || '0'));
    setExtraRate(String(v.extraKmRate || '0'));

    setKml(String(v.fuelConsumptionKml || '10.0'));
    setRunningCost(String(v.runningCostPerKm || '20.50'));
    setProfitKm(String(v.profitPerKm || '15.00'));
    setFixedPerDay(String(v.fixedCostPerDay || '1795.36'));

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: any = {
        vehicleNumber: vNumber.trim(),
        vehicleType: vType.trim(),
        operationCategoryId: operationCategoryId ? parseInt(operationCategoryId, 10) : null,
        defaultLocationId: defaultLocationId ? parseInt(defaultLocationId, 10) : null,
        maxPayloadKg: parseFloat(payloadKg) || 0,
        maxVolumeCbm: parseFloat(volumeCbm) || 0,
        paymentBasis: basis,
        ownershipType: basis === 'ADHOC' ? 'ADHOC' : 'COMMERCIAL',
        status,
        monthlyFixedRate: basis === 'FIXED' ? (parseFloat(monthlyRent) || 0) : 0,
        monthlyKmLimit: basis === 'FIXED' ? (parseInt(limitKm, 10) || 0) : 0,
        extraKmRate: basis === 'FIXED' ? (parseFloat(extraRate) || 0) : 0,
        fuelConsumptionKml: parseFloat(kml) || 0,
        runningCostPerKm: parseFloat(runningCost) || 0,
        profitPerKm: parseFloat(profitKm) || 0,
        fixedCostPerDay: parseFloat(fixedPerDay) || 0,
      };

      if (editingVehicle) {
        const res = await fetch('/api/fleet/vehicles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingVehicle.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error updating vehicle');

        setVehicles((prev) => prev.map((v) => (v.id === editingVehicle.id ? { ...v, ...data.data } : v)));
      } else {
        const res = await fetch('/api/fleet/vehicles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Error creating vehicle');

        setVehicles((prev) => [data.data, ...prev]);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error saving vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this vehicle?')) return;
    try {
      await fetch(`/api/fleet/vehicles?id=${id}`, { method: 'DELETE' });
      setVehicles((prev) => prev.filter((v) => v.id !== id));
      router.refresh();
    } catch (err) {
      alert('Error deleting');
    }
  };

  const filteredVehicles = vehicles.filter((v) => {
    // 1. Search Query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPlate = v.vehicleNumber?.toLowerCase().includes(q);
      const matchType = v.vehicleType?.toLowerCase().includes(q);
      const matchCategory = v.vehicleCategory?.toLowerCase().includes(q);
      const matchTransporter = v.transporterName?.toLowerCase().includes(q);
      const matchOp = v.operationCategory?.name?.toLowerCase().includes(q);
      const matchLoc = v.defaultLocation?.locationName?.toLowerCase().includes(q);
      if (!matchPlate && !matchType && !matchCategory && !matchTransporter && !matchOp && !matchLoc) {
        return false;
      }
    }

    // 2. Payment Basis Filter
    if (basisFilter !== 'ALL') {
      const isAdhoc = v.ownershipType === 'ADHOC' || v.paymentBasis === 'ADHOC';
      const isFixed = v.paymentBasis === 'FIXED';

      if (basisFilter === 'ADHOC') {
        if (!isAdhoc) return false;
      } else if (basisFilter === 'FIXED') {
        if (!isFixed || isAdhoc) return false;
      } else if (basisFilter === 'KM_BASED') {
        if (isFixed || isAdhoc) return false;
      }
    }

    return true;
  });

  return (
    <div className="flex flex-col space-y-2.5 w-full min-h-0">
      {/* Slim Header & Action Toolbar */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 px-1">
          <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span>Fleet Vehicles</span>
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold tabular-nums">
            {basisFilter !== 'ALL' || search ? `${filteredVehicles.length} of ${vehicles.length}` : vehicles.length} Vehicles
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Payment Basis Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={basisFilter}
              onChange={(e) => setBasisFilter(e.target.value as any)}
              className="text-xs font-bold bg-transparent text-slate-700 px-1 py-0.5 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Payment Bases</option>
              <option value="KM_BASED">KM-BASED (Commercial)</option>
              <option value="FIXED">FIXED CONTRACT</option>
              <option value="ADHOC">KM-BASED - AH (Outside / Ad-Hoc)</option>
            </select>
          </div>

          <div className="relative w-36 sm:w-48 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle..."
              className="w-full h-8 text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Register Vehicle</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-thin">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-100 text-gray-700 font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 sticky top-0 z-20 shadow-xs">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">Vehicle Plate</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Type</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Operation</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Base Location</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Capacity</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Payment Basis</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Monthly Rent</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Free KM Limit</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Extra KM Rate</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Running Cost/KM</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Profit/KM</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Fuel Economy</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Daily Fixed</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-gray-400">
                    No vehicles found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v) => {
                  const opName = v.operationCategory?.name || (v.operationCategoryId === 1 ? 'Shuttle Operation' : v.operationCategoryId === 2 ? 'Finished Goods & Other' : '-');
                  const locName = v.defaultLocation?.locationName || '-';
                  const isFixed = v.paymentBasis === 'FIXED';

                  return (
                    <tr key={v.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Vehicle Plate */}
                      <td className="py-2.5 px-3 font-bold text-gray-900 tracking-tight whitespace-nowrap">
                        {v.vehicleNumber}
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">
                        {v.vehicleType}
                      </td>

                      {/* Operation */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {opName}
                        </span>
                      </td>

                      {/* Base Location */}
                      <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">
                        {locName}
                      </td>

                      {/* Capacity */}
                      <td className="py-2.5 px-3 tabular-nums text-gray-700 whitespace-nowrap">
                        <span className="font-semibold">{v.maxPayloadKg ? Number(v.maxPayloadKg).toFixed(0) : '0'} kg</span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-600">{v.maxVolumeCbm ? Number(v.maxVolumeCbm).toFixed(1) : '0'} cbm</span>
                      </td>

                      {/* Payment Basis */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {v.ownershipType === 'ADHOC' || v.paymentBasis === 'ADHOC' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            KM-BASED - AH
                          </span>
                        ) : isFixed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            FIXED CONTRACT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            KM-BASED
                          </span>
                        )}
                      </td>

                      {/* Monthly Rent */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                        {isFixed ? (
                          <span className="font-bold text-purple-900 text-xs">
                            Rs. {Number(v.monthlyFixedRate || 0).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Free KM Limit */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-gray-700 font-medium">
                        {isFixed && Number(v.monthlyKmLimit) > 0 ? (
                          `${Number(v.monthlyKmLimit).toLocaleString()} km`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Extra KM Rate */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-gray-700 font-medium">
                        {isFixed && Number(v.extraKmRate) > 0 ? (
                          `Rs. ${Number(v.extraKmRate).toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Running Cost / KM */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-gray-700 font-medium">
                        {!isFixed && Number(v.runningCostPerKm) > 0 ? (
                          `Rs. ${Number(v.runningCostPerKm).toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Profit / KM */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-gray-700 font-medium">
                        {!isFixed && Number(v.profitPerKm) > 0 ? (
                          `Rs. ${Number(v.profitPerKm).toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Fuel Economy */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-gray-700 font-medium">
                        {Number(v.fuelConsumptionKml) > 0 ? (
                          `${Number(v.fuelConsumptionKml).toFixed(1)} km/L`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Daily Fixed Cost */}
                      <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap text-gray-700 font-medium">
                        {!isFixed && Number(v.fixedCostPerDay) > 0 ? (
                          `Rs. ${Number(v.fixedCostPerDay).toFixed(2)}`
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <StatusBadge status={v.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                            title="Edit Vehicle"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Add / Edit Vehicle Modal - Full Parity with PHP Vehicle Master (Image 1) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingVehicle ? `Edit Vehicle Master: ${editingVehicle.vehicleNumber}` : 'Register New Fleet Vehicle'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Vehicle specifications & costing configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
              {/* SECTION 1: VEHICLE SPECIFICATIONS */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    1. VEHICLE SPECIFICATIONS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Vehicle Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={vNumber}
                      onChange={(e) => setVNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. 227-0834"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl font-bold tracking-tight bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Vehicle Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={vType}
                      onChange={(e) => handleVehicleTypeChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    >
                      <option value="">Select Vehicle Type</option>
                      {vehicleTypes.length > 0 ? (
                        vehicleTypes.map((vt: any) => (
                          <option key={vt.id} value={vt.name}>
                            {vt.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="8.5 ft">8.5 ft</option>
                          <option value="9.5 ft">9.5 ft</option>
                          <option value="10.5 ft">10.5 ft</option>
                          <option value="14.5 ft">14.5 ft</option>
                          <option value="16.5 ft">16.5 ft</option>
                          <option value="20 ft">20 ft</option>
                          <option value="24 ft">24 ft</option>
                          <option value="40 ft">40 ft</option>
                          <option value="Other">Other / Custom</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Operation Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={operationCategoryId}
                      onChange={(e) => setOperationCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    >
                      <option value="">Select Operation</option>
                      {operations.map((op: any) => (
                        <option key={op.id} value={op.id}>
                          {op.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Home Plant / Base Location
                    </label>
                    <select
                      value={defaultLocationId}
                      onChange={(e) => setDefaultLocationId(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    >
                      <option value="">Select Home Plant</option>
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.locationName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Max Payload (KG) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={payloadKg}
                        onChange={(e) => setPayloadKg(e.target.value)}
                        placeholder="2000.00"
                        className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl tabular-nums bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[11px]">
                        KG
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Max Volume (CBM) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={volumeCbm}
                        onChange={(e) => setVolumeCbm(e.target.value)}
                        placeholder="15.00"
                        className="w-full px-3.5 py-2.5 pr-12 border border-gray-300 rounded-xl tabular-nums bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[11px]">
                        CBM
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PAYMENT MODEL & STATUS */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    2. PAYMENT MODEL & STATUS
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Payment Model <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={basis}
                      onChange={(e) => setBasis(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="FIXED">Fixed Monthly Rental (+ Extra KM Tariff)</option>
                      <option value="KM_BASED">KM Based (Running + Fuel)</option>
                      <option value="ADHOC">KM-BASED - AH (Outside / Ad-Hoc)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1.5">
                      Operational Status <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="AVAILABLE">🟢 Available</option>
                      <option value="ALLOCATED">🟡 Allocated</option>
                      <option value="DISPATCHED">🔵 Dispatched</option>
                      <option value="MAINTENANCE">🔴 Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: CONDITIONAL FLEET PARAMETERS */}
              {basis === 'FIXED' ? (
                /* 3A: FIXED FLEET PARAMETERS (Matching Image 1) */
                <div className="bg-purple-50/40 border border-purple-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 pb-2 border-b border-purple-200/60">
                    <span className="text-[11px] font-bold text-purple-900 uppercase tracking-wider">
                      3. FIXED FLEET PARAMETERS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold text-purple-900 mb-1.5">
                        Monthly Base Rental
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required={basis === 'FIXED'}
                          value={monthlyRent}
                          onChange={(e) => setMonthlyRent(e.target.value)}
                          placeholder="314109.73"
                          className="w-full px-3.5 py-2.5 pr-12 border border-purple-300 rounded-xl tabular-nums bg-white font-bold text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 font-semibold text-[11px]">
                          LKR
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-purple-900 mb-1.5">
                        Monthly Free KM Limit
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required={basis === 'FIXED'}
                          value={limitKm}
                          onChange={(e) => setLimitKm(e.target.value)}
                          placeholder="1000"
                          className="w-full px-3.5 py-2.5 pr-10 border border-purple-300 rounded-xl tabular-nums bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 font-semibold text-[11px]">
                          KM
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-purple-900 mb-1.5">
                        Extra KM Rate
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          required={basis === 'FIXED'}
                          value={extraRate}
                          onChange={(e) => setExtraRate(e.target.value)}
                          placeholder="113.44"
                          className="w-full px-3.5 py-2.5 pr-12 border border-purple-300 rounded-xl tabular-nums bg-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 font-semibold text-[11px]">
                          LKR
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 3B: KM-BASED OPERATING PARAMETERS (Matching Image 2) */
                <div className="bg-blue-50/40 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                      3. KM-BASED OPERATING PARAMETERS
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1.5">Fuel Consumption</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          value={kml}
                          onChange={(e) => setKml(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-12 border border-gray-300 rounded-xl tabular-nums bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[10px]">
                          km/L
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1.5">Run Cost / KM</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={runningCost}
                          onChange={(e) => setRunningCost(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-12 border border-gray-300 rounded-xl tabular-nums bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[10px]">
                          LKR
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1.5">Driver Profit / KM</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={profitKm}
                          onChange={(e) => setProfitKm(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-12 border border-gray-300 rounded-xl tabular-nums bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[10px]">
                          LKR
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1.5">Daily Fixed</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={fixedPerDay}
                          onChange={(e) => setFixedPerDay(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-12 border border-gray-300 rounded-xl tabular-nums bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-[10px]">
                          LKR
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions (Matching Image 1) */}
              <div className="border-t border-gray-100 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Vehicle...</span>
                    </>
                  ) : (
                    <span>Save Vehicle</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
