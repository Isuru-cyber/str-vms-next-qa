'use client';

import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertTriangle, Loader2, X } from 'lucide-react';
import { SessionUser } from '@/lib/auth';

interface FirstLoginPasswordModalProps {
  user: SessionUser | null;
}

export function FirstLoginPasswordModal({ user }: FirstLoginPasswordModalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(() => Boolean(user?.mustChangePassword));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen || !user?.mustChangePassword) {
    return null;
  }

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await fetch('/api/profile/dismiss-password-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // ignore
    } finally {
      setIsDismissing(false);
      setIsOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[\W_]/.test(newPassword)) {
      setErrorMessage('Password must be at least 8 characters long and contain letters, numbers, and special characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
          isFirstLogin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      setSuccessMessage('Password updated successfully! Redirecting...');
      setTimeout(() => {
        setIsOpen(false);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while updating your password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">
                Update Temporary Password
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                First-time sign in security verification
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isSubmitting || isDismissing}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
            title="Skip for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
            <p className="font-semibold mb-0.5">Welcome, {user.name}!</p>
            <p className="text-blue-800 text-[11px]">
              You are currently logged in with an initial password. For improved security, you may update it now. If you prefer, you can skip this step and keep your current password, or change it later in your profile.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* New Password Input */}
          <div className="space-y-1.5">
            <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
              New Personal Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 chars, letters, numbers & symbols"
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="block font-bold text-gray-800 uppercase tracking-wider text-[11px]">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 p-0.5 cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDismiss}
              disabled={isSubmitting || isDismissing}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer text-center"
            >
              {isDismissing ? 'Skipping...' : 'Skip for Now (Keep Current)'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isDismissing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs disabled:opacity-50 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Update Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
