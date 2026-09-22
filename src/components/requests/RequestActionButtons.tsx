'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X, AlertTriangle, Loader2, XCircle } from 'lucide-react';

interface RequestActionButtonsProps {
  requestId: number;
  requestCode: string;
  status: string;
  isAllocated?: boolean;
  compact?: boolean;
  userRole?: string;
  requesterId?: number;
  currentUserId?: number;
}

const PRESET_DELETE_REASONS = [
  'Duplicate entry / Created by mistake',
  'Production postponed / Cargo not ready',
  'Order cancelled by customer/client',
  'Incorrect dispatch destination or quantity',
  'Custom Reason',
];

const PRESET_REJECT_REASONS = [
  'Fleet capacity exceeded / No suitable truck available',
  'Destination route inaccessible / Bay restricted',
  'Cargo dimensions or weight exceed fleet safety envelope',
  'Request unverified / Production schedule mismatch',
  'Custom Reason',
];

export function RequestActionButtons({
  requestId,
  requestCode,
  status,
  isAllocated = false,
  compact = false,
  userRole = '',
  requesterId,
  currentUserId,
}: RequestActionButtonsProps) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const [deletePresetReason, setDeletePresetReason] = useState(PRESET_DELETE_REASONS[0]);
  const [deleteCustomReason, setDeleteCustomReason] = useState('');

  const [rejectPresetReason, setRejectPresetReason] = useState(PRESET_REJECT_REASONS[0]);
  const [rejectCustomReason, setRejectCustomReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const normalizedStatus = (status || '').toUpperCase();
  const isDispatcherOrAdmin = ['SUPER_ADMIN', 'ADMIN', 'POWER_USER', 'DISPATCHER'].includes(userRole);
  const isOwner = currentUserId && requesterId ? currentUserId === requesterId : true;

  // Only dispatchers/admins can reject requests; Entry users cannot reject
  const canReject =
    isDispatcherOrAdmin &&
    ['SUBMITTED', 'UNDER REVIEW', 'DRAFT'].includes(normalizedStatus) &&
    !isAllocated;

  // Users can delete if dispatcher/admin OR if they own the request
  const canDelete =
    ['SUBMITTED', 'UNDER REVIEW', 'DRAFT'].includes(normalizedStatus) &&
    !isAllocated &&
    (isDispatcherOrAdmin || isOwner);

  // Edit is allowed if not in locked statuses, and caller is owner or dispatcher
  const canEdit =
    !['DISPATCHED', 'READY_FOR_LOADING', 'GATE_PASS_ISSUED', 'IN_TRANSIT', 'COMPLETED', 'FINALIZED', 'CLOSED', 'CANCELLED', 'REJECTED'].includes(normalizedStatus) &&
    (isDispatcherOrAdmin || isOwner);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const finalReason =
      deletePresetReason === 'Custom Reason' || !deletePresetReason
        ? deleteCustomReason.trim() || 'Deleted by requester'
        : deleteCustomReason.trim()
        ? `${deletePresetReason} - ${deleteCustomReason.trim()}`
        : deletePresetReason;

    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete vehicle request');
      }

      setIsDeleteModalOpen(false);
      router.refresh();
      if (!compact) {
        router.push('/requests?deleted=1');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while deleting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    const finalReason =
      rejectPresetReason === 'Custom Reason' || !rejectPresetReason
        ? rejectCustomReason.trim() || 'Rejected by Fleet Management'
        : rejectCustomReason.trim()
        ? `${rejectPresetReason} - ${rejectCustomReason.trim()}`
        : rejectPresetReason;

    try {
      const res = await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to reject vehicle request');
      }

      setIsRejectModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while rejecting');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canEdit && !canDelete && !canReject && !compact) {
    return null;
  }

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1 shrink-0">
          {canEdit ? (
            <Link
              href={`/requests/${requestId}/edit`}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0"
              title="Edit Request"
            >
              <Pencil className="w-3 h-3" />
            </Link>
          ) : (
            <div className="w-5 h-5 shrink-0" />
          )}
          {canReject && (
            <button
              type="button"
              onClick={() => setIsRejectModalOpen(true)}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer shrink-0"
              title="Reject Request"
            >
              <XCircle className="w-3 h-3" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              title="Delete Request"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {isDeleteModalOpen && (
          <ReasonModal
            title="Delete Vehicle Request"
            iconColor="text-rose-600 bg-rose-50 border-rose-100"
            buttonColor="bg-rose-600 hover:bg-rose-700"
            buttonText="Confirm Deletion"
            requestCode={requestCode}
            presetOptions={PRESET_DELETE_REASONS}
            presetReason={deletePresetReason}
            setPresetReason={setDeletePresetReason}
            customReason={deleteCustomReason}
            setCustomReason={setDeleteCustomReason}
            isSubmitting={isSubmitting}
            errorMsg={errorMsg}
            onClose={() => setIsDeleteModalOpen(false)}
            onSubmit={handleDelete}
          />
        )}

        {isRejectModalOpen && (
          <ReasonModal
            title="Reject Vehicle Request"
            iconColor="text-amber-600 bg-amber-50 border-amber-100"
            buttonColor="bg-amber-600 hover:bg-amber-700"
            buttonText="Reject Request"
            requestCode={requestCode}
            presetOptions={PRESET_REJECT_REASONS}
            presetReason={rejectPresetReason}
            setPresetReason={setRejectPresetReason}
            customReason={rejectCustomReason}
            setCustomReason={setRejectCustomReason}
            isSubmitting={isSubmitting}
            errorMsg={errorMsg}
            onClose={() => setIsRejectModalOpen(false)}
            onSubmit={handleReject}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {canReject && (
          <button
            type="button"
            onClick={() => setIsRejectModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject Request</span>
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors shadow-xs cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Request</span>
          </button>
        )}

        {canEdit && (
          <Link
            href={`/requests/${requestId}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-xs"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Request {isAllocated ? '(Load Specs)' : ''}</span>
          </Link>
        )}
      </div>

      {isDeleteModalOpen && (
        <ReasonModal
          title="Delete Vehicle Request"
          iconColor="text-rose-600 bg-rose-50 border-rose-100"
          buttonColor="bg-rose-600 hover:bg-rose-700"
          buttonText="Confirm Deletion"
          requestCode={requestCode}
          presetOptions={PRESET_DELETE_REASONS}
          presetReason={deletePresetReason}
          setPresetReason={setDeletePresetReason}
          customReason={deleteCustomReason}
          setCustomReason={setDeleteCustomReason}
          isSubmitting={isSubmitting}
          errorMsg={errorMsg}
          onClose={() => setIsDeleteModalOpen(false)}
          onSubmit={handleDelete}
        />
      )}

      {isRejectModalOpen && (
        <ReasonModal
          title="Reject Vehicle Request"
          iconColor="text-amber-600 bg-amber-50 border-amber-100"
          buttonColor="bg-amber-600 hover:bg-amber-700"
          buttonText="Reject Request"
          requestCode={requestCode}
          presetOptions={PRESET_REJECT_REASONS}
          presetReason={rejectPresetReason}
          setPresetReason={setRejectPresetReason}
          customReason={rejectCustomReason}
          setCustomReason={setRejectCustomReason}
          isSubmitting={isSubmitting}
          errorMsg={errorMsg}
          onClose={() => setIsRejectModalOpen(false)}
          onSubmit={handleReject}
        />
      )}
    </>
  );
}

function ReasonModal({
  title,
  iconColor,
  buttonColor,
  buttonText,
  requestCode,
  presetOptions,
  presetReason,
  setPresetReason,
  customReason,
  setCustomReason,
  isSubmitting,
  errorMsg,
  onClose,
  onSubmit,
}: {
  title: string;
  iconColor: string;
  buttonColor: string;
  buttonText: string;
  requestCode: string;
  presetOptions: string[];
  presetReason: string;
  setPresetReason: (v: string) => void;
  customReason: string;
  setCustomReason: (v: string) => void;
  isSubmitting: boolean;
  errorMsg: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold border ${iconColor}`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{title}</h3>
              <p className="text-xs text-gray-500">
                Request: <span className="font-bold text-indigo-600 tracking-tight">{requestCode}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Select Reason <span className="text-rose-500">*</span>
            </label>
            <select
              value={presetReason}
              onChange={(e) => setPresetReason(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 text-gray-800"
            >
              {presetOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Additional Details / Comments
            </label>
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Provide extra explanation or notes for the requester..."
              className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 text-gray-800"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white font-semibold shadow-xs disabled:opacity-50 cursor-pointer text-xs ${buttonColor}`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{buttonText}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
