'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Phone,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface DriverRegistryProps {
  initialDrivers: any[];
  vehicles: any[];
  plants?: any[];
}

export function DriverRegistry({
  initialDrivers = [],
  vehicles = [],
  plants = [],
}: DriverRegistryProps) {
  const router = useRouter();
  const [drivers, setDrivers] = useState(initialDrivers);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<any>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formLicense, setFormLicense] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [formVehicleId, setFormVehicleId] = useState('');
  const [formPlantId, setFormPlantId] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formStatus, setFormStatus] = useState('AVAILABLE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAdd = () => {
    setEditingDriver(null);
    setFormName('');
    setFormNic('');
    setFormMobile('');
    setFormLicense('');
    setFormExpiry('');
    setFormVehicleId('');
    setFormPlantId('');
    setFormRemarks('');
    setFormStatus('AVAILABLE');
    setIsModalOpen(true);
  };

  const openEdit = (d: any) => {
    setEditingDriver(d);
    setFormName(d.name);
    setFormNic(d.nic);
    setFormMobile(d.mobile);
    setFormLicense(d.licenseNumber || '');
    setFormExpiry(d.licenseExpiry ? new Date(d.licenseExpiry).toISOString().split('T')[0] : '');
    setFormVehicleId(d.linkedVehicleId ? String(d.linkedVehicleId) : '');
    setFormPlantId(d.linkedPlantId ? String(d.linkedPlantId) : (d.linkedPlant?.id ? String(d.linkedPlant.id) : ''));
    setFormRemarks(d.remarks || '');
    setFormStatus(d.status || 'AVAILABLE');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingDriver) {
        const res = await fetch('/api/fleet/drivers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDriver.id,
            name: formName,
            nic: formNic,
            mobile: formMobile,
            licenseNumber: formLicense,
            licenseExpiry: formExpiry || null,
            linkedVehicleId: formVehicleId || null,
            linkedPlantId: formPlantId || null,
            remarks: formRemarks || null,
            status: formStatus,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setDrivers((prev) => prev.map((d) => (d.id === editingDriver.id ? data.data : d)));
      } else {
        const res = await fetch('/api/fleet/drivers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            nic: formNic,
            mobile: formMobile,
            licenseNumber: formLicense,
            licenseExpiry: formExpiry || null,
            linkedVehicleId: formVehicleId || null,
            linkedPlantId: formPlantId || null,
            remarks: formRemarks || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        setDrivers((prev) => [data.data, ...prev]);
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error saving driver');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this driver?')) return;
    try {
      await fetch(`/api/fleet/drivers?id=${id}`, { method: 'DELETE' });
      setDrivers((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } catch (err) {
      alert('Error deleting');
    }
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.nic?.toLowerCase().includes(search.toLowerCase()) ||
      d.mobile?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col space-y-2.5 w-full min-h-0">
      {/* Slim Header & Action Toolbar (No bulky card, no subtitle) */}
      <div className="bg-white rounded-xl shadow-2xs border border-slate-200 p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2 px-1">
          <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            <span className="hidden xs:inline">Commercial Fleet </span>Drivers
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold tabular-nums">
            {drivers.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="relative w-36 sm:w-48 md:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search driver..."
              className="w-full h-8 text-xs border border-slate-200 rounded-lg pl-8 pr-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="h-8 inline-flex items-center gap-1 px-2.5 sm:px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden xs:inline">Add Driver</span>
            <span className="xs:hidden">Add</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col min-h-0">

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Driver Name</th>
                <th className="py-3 px-4">NIC Number</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">License Number</th>
                <th className="py-3 px-4">Primary Vehicle</th>
                <th className="py-3 px-4">Home Plant</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDrivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-gray-900">{d.name}</td>
                  <td className="py-3.5 px-4 font-medium text-gray-700 tabular-nums">{d.nic}</td>
                  <td className="py-3.5 px-4 font-semibold text-gray-800 tabular-nums">{d.mobile}</td>
                  <td className="py-3.5 px-4 text-gray-600 tabular-nums">{d.licenseNumber || '-'}</td>
                  <td className="py-3.5 px-4 font-bold text-indigo-700 tracking-tight">
                    {d.linkedVehicle?.vehicleNumber || '-'}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-gray-700 whitespace-nowrap">
                    {d.linkedPlant?.name || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(d)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="Edit Driver"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Delete Driver"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Driver Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {editingDriver ? `Edit Driver: ${editingDriver.name}` : 'Register New Fleet Driver'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Configure driver profile, license details and plant allocation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Full Driver Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">
                    NIC Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formNic}
                    onChange={(e) => setFormNic(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">
                    Mobile Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">License Number</label>
                  <input
                    type="text"
                    value={formLicense}
                    onChange={(e) => setFormLicense(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">License Expiry</label>
                  <input
                    type="date"
                    value={formExpiry}
                    onChange={(e) => setFormExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">Assigned Vehicle</label>
                  <select
                    value={formVehicleId}
                    onChange={(e) => setFormVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm bg-white"
                  >
                    <option value="">-- No vehicle linked --</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} ({v.vehicleType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">Home Plant</label>
                  <select
                    value={formPlantId}
                    onChange={(e) => setFormPlantId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm bg-white"
                  >
                    <option value="">-- No plant linked --</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">Remarks</label>
                <textarea
                  rows={2}
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Any notes or remarks regarding driver..."
                  className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm bg-white"
                />
              </div>

              {editingDriver && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Driver Availability</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="ASSIGNED">ASSIGNED / ON TRIP</option>
                    <option value="ON LEAVE">ON LEAVE</option>
                  </select>
                </div>
              )}

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Save Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
