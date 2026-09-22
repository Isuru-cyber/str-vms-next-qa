"use client";

import React, { useState } from "react";
import {
  Fuel,
  Lock,
  Unlock,
  Plus,
  Edit2,
  CheckCircle2,
  X,
  Search,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";

interface FuelRate {
  id: number;
  periodMonth: string;
  dieselRate: number;
  isLocked: number;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface FuelRateManagerProps {
  initialRates: FuelRate[];
}

export function FuelRateManager({ initialRates }: FuelRateManagerProps) {
  const [rates, setRates] = useState<FuelRate[]>(initialRates);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<FuelRate | null>(null);

  // Form State
  const [periodMonth, setPeriodMonth] = useState("");
  const [dieselRate, setDieselRate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenAdd = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setEditingRate(null);
    setPeriodMonth(currentMonth);
    setDieselRate("");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rate: FuelRate) => {
    setEditingRate(rate);
    setPeriodMonth(rate.periodMonth);
    setDieselRate(String(rate.dieselRate));
    setNotes(rate.notes || "");
    setIsModalOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodMonth,
          dieselRate: parseFloat(dieselRate),
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showFeedback("error", data.message || "Failed to save rate.");
        return;
      }

      // Update state
      const existingIdx = rates.findIndex((r) => r.periodMonth === periodMonth);
      if (existingIdx >= 0) {
        const updated = [...rates];
        updated[existingIdx] = data.rate;
        setRates(updated);
      } else {
        setRates([data.rate, ...rates].sort((a, b) => b.periodMonth.localeCompare(a.periodMonth)));
      }

      setIsModalOpen(false);
      showFeedback("success", data.message);
    } catch (err: any) {
      showFeedback("error", err.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (rate: FuelRate) => {
    const targetState = rate.isLocked === 1 ? "UNLOCK" : "LOCK";
    if (
      !confirm(
        `Are you sure you want to ${targetState} the fuel rate for ${rate.periodMonth}? ${
          targetState === "LOCK"
            ? "When locked, standard freight costing calculations are frozen."
            : "When unlocked, rates can be edited."
        }`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/fuel-rates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rate.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showFeedback("error", data.message || "Failed to toggle lock status.");
        return;
      }

      setRates(rates.map((r) => (r.id === rate.id ? data.rate : r)));
      showFeedback("success", data.message);
    } catch (err: any) {
      showFeedback("error", err.message || "Network error");
    }
  };

  // Filtered rates
  const filteredRates = rates.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.periodMonth.toLowerCase().includes(term) ||
      (r.notes && r.notes.toLowerCase().includes(term))
    );
  });

  const latestActiveRate = rates.find((r) => r.isLocked === 0) || rates[0];
  const lockedCount = rates.filter((r) => r.isLocked === 1).length;
  const totalIndexed = rates.length;
  const averageRate = totalIndexed > 0 ? rates.reduce((sum, r) => sum + r.dieselRate, 0) / totalIndexed : 0;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold text-white transition-all ${
            feedback.type === "success" ? "bg-emerald-600 border border-emerald-500" : "bg-rose-600 border border-rose-500"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Slim Header (No bulky card, no subtitle) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1 pt-1">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            Monthly Auto Diesel Rate Index
          </h1>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Index Monthly Rate</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Latest Active Rate
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tabular-nums text-indigo-700">
              {latestActiveRate ? formatCurrency(latestActiveRate.dieselRate) : "LKR 0.00"}
            </span>
            <span className="text-xs text-gray-400">/ Liter</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Historical Tracked
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tabular-nums text-gray-900">
              {totalIndexed}
            </span>
            <span className="text-xs text-gray-400">Monthly Revisions</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Annual Average
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold tabular-nums text-gray-900">
              {formatCurrency(averageRate)}
            </span>
            <span className="text-xs text-gray-400">/ Liter</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search period (YYYY-MM) or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-gray-800"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Showing {filteredRates.length} records
        </div>
      </div>

      {/* Rates Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Period Month</th>
                <th className="py-3 px-4">Auto Diesel Price</th>
                <th className="py-3 px-4">Safeguard Status</th>
                <th className="py-3 px-4">Circular Notes</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No fuel rate records found matching your filter.
                  </td>
                </tr>
              ) : (
                filteredRates.map((r) => {
                  const isLocked = r.isLocked === 1;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-900 text-sm tabular-nums">
                        {r.periodMonth}
                      </td>
                      <td className="py-3.5 px-4 text-base font-bold text-indigo-700 tabular-nums">
                        {formatCurrency(r.dieselRate)} / L
                      </td>
                      <td className="py-3.5 px-4">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                            <Lock className="w-3.5 h-3.5 text-gray-500" />
                            <span>Locked (Audited)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Active Rate (Editable)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                        {r.notes || "Official monthly price index"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleLock(r)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isLocked
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            }`}
                            title={isLocked ? "Unlock Period" : "Lock Period Safeguard"}
                          >
                            {isLocked ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unlock</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Lock</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleOpenEdit(r)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            title={isLocked ? "Locked rates cannot be edited" : "Edit rate"}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
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

      {/* Modal for Add / Edit Fuel Rate */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Fuel className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {editingRate ? `Edit Fuel Rate: ${editingRate.periodMonth}` : "Index Monthly Diesel Rate"}
                  </h3>
                  <p className="text-xs text-gray-500">Benchmark CPC diesel tariff used for KM-based billing</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Period Month (YYYY-MM) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="month"
                  required
                  disabled={Boolean(editingRate)}
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 tabular-nums disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Auto Diesel Rate (LKR / Liter) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 390.00"
                  value={dieselRate}
                  onChange={(e) => setDieselRate(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-700 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Circular / Official Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Official CPC CPC/REV/2026/09 price revision circular benchmark"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
