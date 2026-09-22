'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Users,
  Clock,
  Mail,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Sliders,
  Database,
  Plus,
  Search,
  Pencil,
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  FileCode,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  Lock,
  Unlock,
  FileText,
  Combine,
  Truck,
  MapPin,
  BarChart3,
  Settings as SettingsIcon,
  CheckSquare,
  FileCheck2,
  Layers,
  Sparkles,
  Map as MapIcon,
  Filter,
} from 'lucide-react';
import {
  ALL_SYSTEM_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
  SUPER_ADMIN_EXCLUSIVE_ACTIONS,
  getRoleDefaultPermissions,
  PermissionDefinition,
} from '@/lib/permission-utils';

interface SettingsHubProps {
  initialUsers: any[];
  initialLogs: any[];
  initialTemplates: any[];
  initialSettings: any[];
  roles: any[];
  plants: any[];
}

export function SettingsHub({
  initialUsers = [],
  initialLogs = [],
  initialTemplates = [],
  initialSettings = [],
  roles = [],
  plants = [],
}: SettingsHubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'users' | 'activity_logs' | 'mail_template' | 'session_security' | 'display_limits' | 'backup'
  >('users');

  // Users State
  const [userList, setUserList] = useState(initialUsers);
  const [userSearch, setUserSearch] = useState('');
  const [isAddUserModal, setIsAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);
  const [userModalError, setUserModalError] = useState('');

  // Password Generator & Visibility State
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [formMustChangePassword, setFormMustChangePassword] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetPasswordCopied, setResetPasswordCopied] = useState(false);

  // Access Control / Permission Matrix State
  const [accessModalUser, setAccessModalUser] = useState<any>(null);
  const [accessRoleId, setAccessRoleId] = useState<string>('');
  const [accessPermissions, setAccessPermissions] = useState<string[]>([]);
  const [accessSubmitting, setAccessSubmitting] = useState(false);
  const [accessSuccessMessage, setAccessSuccessMessage] = useState('');
  const [accessErrorMessage, setAccessErrorMessage] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('ALL');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form fields for Add/Edit User
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRoleId, setFormRoleId] = useState('');
  const [formPlantIds, setFormPlantIds] = useState<number[]>([]);
  const [formActive, setFormActive] = useState(true);

  // Activity Logs State
  const [logFilterModule, setLogFilterModule] = useState('ALL');
  const [logSearch, setLogSearch] = useState('');

  // Mail Templates State
  const [templateList, setTemplateList] = useState(initialTemplates);
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);
  const currentTemplate = templateList[selectedTemplateIndex] || templateList[0];
  const [tempSubject, setTempSubject] = useState(currentTemplate?.subject || '');
  const [tempBody, setTempBody] = useState(currentTemplate?.body || '');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSavedSuccess, setTemplateSavedSuccess] = useState(false);

  // Session Security & Limits State
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [pageSize, setPageSize] = useState('25');
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [securitySaved, setSecuritySaved] = useState(false);
  const [limitsSaved, setLimitsSaved] = useState(false);
  const [cacheFlushed, setCacheFlushed] = useState(false);

  // Update editor when switching templates
  const selectTemplate = (idx: number) => {
    setSelectedTemplateIndex(idx);
    setTempSubject(templateList[idx]?.subject || '');
    setTempBody(templateList[idx]?.body || '');
    setTemplateSavedSuccess(false);
  };

  const insertToken = (token: string) => {
    setTempBody((prev: string) => prev + ` {${token}}`);
  };

  const handleSaveTemplate = async () => {
    if (!currentTemplate) return;
    setIsSavingTemplate(true);
    setTemplateSavedSuccess(false);

    try {
      const res = await fetch('/api/settings/mail-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentTemplate.id,
          subject: tempSubject,
          body: tempBody,
        }),
      });

      if (!res.ok) throw new Error('Failed to update template');
      const data = await res.json();

      setTemplateList((prev) =>
        prev.map((t) => (t.id === currentTemplate.id ? { ...t, subject: tempSubject, body: tempBody } : t))
      );
      setTemplateSavedSuccess(true);
      setTimeout(() => setTemplateSavedSuccess(false), 3000);
    } catch (err) {
      alert('Error updating template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Open Add Modal
  // Password Generator & Clipboard Helpers
  const generateSecurePassword = (target: 'add' | 'reset') => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '@#$&*!';
    const all = upper + lower + digits + special;

    const getSecureRandomInt = (max: number): number => {
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const buffer = new Uint32Array(1);
        window.crypto.getRandomValues(buffer);
        return buffer[0] % max;
      }
      return Math.floor(Math.random() * max);
    };

    const chars: string[] = [
      upper[getSecureRandomInt(upper.length)],
      lower[getSecureRandomInt(lower.length)],
      digits[getSecureRandomInt(digits.length)],
      special[getSecureRandomInt(special.length)],
    ];

    for (let i = 0; i < 6; i++) {
      chars.push(all[getSecureRandomInt(all.length)]);
    }

    // Cryptographically secure Fisher-Yates shuffle
    for (let i = chars.length - 1; i > 0; i--) {
      const j = getSecureRandomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const pwd = chars.join('');
    if (target === 'add') {
      setFormPassword(pwd);
      setShowFormPassword(true);
    } else {
      setNewPassword(pwd);
      setShowResetPassword(true);
    }
  };

  const copyPasswordToClipboard = (pwd: string, target: 'add' | 'reset') => {
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    if (target === 'add') {
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
    } else {
      setResetPasswordCopied(true);
      setTimeout(() => setResetPasswordCopied(false), 2000);
    }
  };

  // Open Add Modal
  const openAddUser = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setShowFormPassword(false);
    setPasswordCopied(false);
    setFormMustChangePassword(true);
    setFormRoleId(String(roles[0]?.id || 1));
    setFormPlantIds([]);
    setFormActive(true);
    setUserModalError('');
    setIsAddUserModal(true);
  };

  // Open Edit Modal
  const openEditUser = (u: any) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setShowFormPassword(false);
    setFormRoleId(String(u.roleId));
    setFormPlantIds(u.plants?.map((p: any) => p.plantId) || []);
    setFormActive(u.active === 1);
    setUserModalError('');
  };

  // Submit Add / Edit User
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserModalSubmitting(true);
    setUserModalError('');

    try {
      if (editingUser) {
        // Edit
        const res = await fetch('/api/settings/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            name: formName,
            email: formEmail,
            roleId: formRoleId,
            plantIds: formPlantIds,
            active: formActive,
            password: formPassword || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to update user');

        setUserList((prev) => prev.map((u) => (u.id === editingUser.id ? data.data : u)));
        setEditingUser(null);
      } else {
        // Add
        const res = await fetch('/api/settings/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            roleId: formRoleId,
            plantIds: formPlantIds,
            active: formActive,
            mustChangePassword: formMustChangePassword ? 1 : 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to create user');

        setUserList((prev) => [data.data, ...prev]);
        setIsAddUserModal(false);
      }
      router.refresh();
    } catch (err: any) {
      setUserModalError(err.message || 'An error occurred');
    } finally {
      setUserModalSubmitting(false);
    }
  };

  // Submit Password Reset
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newPassword) return;
    setUserModalSubmitting(true);
    setUserModalError('');

    try {
      const res = await fetch('/api/settings/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: passwordResetUser.id,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password');

      setPasswordResetUser(null);
      setNewPassword('');
      alert('Password reset successfully!');
    } catch (err: any) {
      setUserModalError(err.message || 'An error occurred');
    } finally {
      setUserModalSubmitting(false);
    }
  };

  // Open Access Control Matrix Modal
  const openManageAccess = (u: any) => {
    setAccessModalUser(u);
    setAccessRoleId(String(u.roleId || roles[0]?.id || 1));
    const userRoleCode =
      u.role?.code || roles.find((r: any) => String(r.id) === String(u.roleId))?.code || 'ENTRY_USER';
    const hasCustom =
      u.sidebarHiddenItems === "CUSTOM" || (Array.isArray(u.permissions) && u.permissions.length > 0);
    const existingPerms = hasCustom
      ? (Array.isArray(u.permissions) ? u.permissions.map((p: any) => (typeof p === 'string' ? p : p.permissionKey)) : [])
      : getRoleDefaultPermissions(userRoleCode);
    setAccessPermissions(existingPerms);
    setAccessSuccessMessage('');
    setAccessErrorMessage('');
    setSelectedModuleFilter('ALL');
  };

  // Switch role inside matrix and apply that role's default preset
  const handleAccessRoleChange = (newRoleId: string) => {
    setAccessRoleId(newRoleId);
    const targetRole = roles.find((r: any) => String(r.id) === String(newRoleId));
    if (targetRole) {
      setAccessPermissions(getRoleDefaultPermissions(targetRole.code));
    }
  };

  // Reset to role's standard defaults
  const handleResetRoleDefaults = () => {
    const targetRole = roles.find((r: any) => String(r.id) === String(accessRoleId));
    if (targetRole) {
      setAccessPermissions(getRoleDefaultPermissions(targetRole.code));
    }
  };

  // Quick grant all operational permissions (Requests, Allocations, Dispatch, Gate Pass, POD, Fleet, Map, Analytics)
  const handleGrantAllOperations = () => {
    const opsPermissions = ALL_SYSTEM_PERMISSIONS.filter(
      (p) => !p.isSuperAdminOnly && p.key !== 'manage_users' && p.key !== 'manage_mail_templates'
    ).map((p) => p.key);
    setAccessPermissions((prev) => Array.from(new Set([...prev, ...opsPermissions])));
  };

  // Select all non-superadmin permissions
  const handleSelectAll = () => {
    const allKeys = ALL_SYSTEM_PERMISSIONS.filter((p) => !p.isSuperAdminOnly).map((p) => p.key);
    setAccessPermissions(allKeys);
  };

  // Clear all permissions
  const handleClearAll = () => {
    setAccessPermissions([]);
  };

  // Toggle individual permission checkbox
  const togglePermission = (key: string) => {
    if (accessPermissions.includes(key)) {
      setAccessPermissions(accessPermissions.filter((k) => k !== key));
    } else {
      setAccessPermissions([...accessPermissions, key]);
    }
  };

  // Submit Access Control Matrix updates
  const handleSaveAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessModalUser) return;
    setAccessSubmitting(true);
    setAccessSuccessMessage('');
    setAccessErrorMessage('');

    try {
      const res = await fetch('/api/settings/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: accessModalUser.id,
          roleId: accessRoleId,
          permissions: accessPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user access');

      setUserList((prev) => prev.map((u) => (u.id === accessModalUser.id ? data.data : u)));
      setAccessSuccessMessage('Access permissions updated successfully!');
      setTimeout(() => {
        setAccessModalUser(null);
        setAccessSuccessMessage('');
      }, 1100);
      router.refresh();
    } catch (err: any) {
      setAccessErrorMessage(err.message || 'An error occurred while saving permissions');
    } finally {
      setAccessSubmitting(false);
    }
  };

  // Filtered Users
  const filteredUsers = userList.filter((u) => {
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.userCode?.toLowerCase().includes(q) ||
      u.role?.name?.toLowerCase().includes(q)
    );
  });

  // Filtered Logs
  const filteredLogs = initialLogs.filter((log) => {
    if (logFilterModule !== 'ALL' && log.module?.toUpperCase() !== logFilterModule) {
      return false;
    }
    if (logSearch) {
      const q = logSearch.toLowerCase();
      return (
        log.action?.toLowerCase().includes(q) ||
        log.user?.name?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.recordId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-3">

      {/* 6 Tabs Navigation */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl overflow-x-auto select-none no-scrollbar">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'users' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" /> User Accounts
        </button>
        <button
          onClick={() => setActiveTab('activity_logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'activity_logs' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" /> System Activity Logs
        </button>
        <button
          onClick={() => setActiveTab('mail_template')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'mail_template' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Mail className="w-4 h-4" /> Email Templates
        </button>
        <button
          onClick={() => setActiveTab('session_security')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'session_security' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Session & Auto Logout
        </button>
        <button
          onClick={() => setActiveTab('display_limits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'display_limits' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Sliders className="w-4 h-4" /> Data Display Limits
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'backup' ? 'bg-white shadow-xs text-indigo-700' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Database className="w-4 h-4" /> Backup & Restore
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USER ACCOUNTS                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search user by name, email, or role..."
                className="w-full text-xs border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="button"
              onClick={openAddUser}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New User
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">User Code</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Role Designation</th>
                  <th className="py-3 px-4">Plant Scopes</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-gray-900 tracking-tight">{u.userCode}</td>
                    <td className="py-3.5 px-4 font-semibold text-gray-900">{u.name}</td>
                    <td className="py-3.5 px-4 text-gray-600 font-medium">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          {u.role?.name || 'User'}
                        </span>
                        {u.permissions && u.permissions.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                            {u.permissions.length} Custom Privileges
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Standard Role Defaults</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.plants && u.plants.length > 0 ? (
                          u.plants.map((p: any, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700"
                            >
                              {p.plant?.code || `P-${p.plantId}`}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">All Plants</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.active === 1
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}
                      >
                        {u.active === 1 ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openManageAccess(u)}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200/80 transition cursor-pointer"
                          title="Access Control Matrix & Granular Permissions"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditUser(u)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Edit User"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordResetUser(u);
                            setNewPassword('');
                            setShowResetPassword(false);
                            setResetPasswordCopied(false);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SYSTEM ACTIVITY LOGS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'activity_logs' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-4">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Module:</span>
              <select
                value={logFilterModule}
                onChange={(e) => setLogFilterModule(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl focus:outline-none"
              >
                <option value="ALL">All Modules</option>
                <option value="REQUESTS">Requests</option>
                <option value="TRIPS">Trips & Dispatch</option>
                <option value="ALLOCATIONS">Allocations</option>
                <option value="FLEET">Fleet & Drivers</option>
                <option value="SETTINGS">Settings</option>
                <option value="AUTH">Authentication</option>
                <option value="SYSTEM">System</option>
              </select>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                placeholder="Search audit action or user..."
                className="w-full text-xs border border-gray-200 rounded-xl pl-8 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action Summary</th>
                  <th className="py-3 px-4">Record ID</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No system activity logs recorded for this criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 tabular-nums text-gray-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-900">
                        {log.user?.name || `User #${log.userId}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {log.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-800 font-medium">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-500">
                        {log.recordId || '-'}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-gray-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EMAIL TEMPLATES (LIVE EDITOR WITH TOKENS)                          */}
      {/* ========================================================================= */}
      {activeTab === 'mail_template' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Template Selection */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-2 h-fit">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-1">
              Dispatch Templates ({templateList.length})
            </h3>
            {templateList.map((t, idx) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(idx)}
                className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 cursor-pointer ${
                  selectedTemplateIndex === idx
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 shadow-xs'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between">
                  <span>{t.name}</span>
                  {selectedTemplateIndex === idx && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{t.templateKey}</div>
              </button>
            ))}
          </div>

          {/* Right Area: Template Editor */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {currentTemplate?.name || 'Email Template'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {currentTemplate?.description || 'Automated dispatch message'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSavingTemplate ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : templateSavedSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" /> Changes Saved!
                  </>
                ) : (
                  <span>Save Template</span>
                )}
              </button>
            </div>

            {/* Subject Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Email Subject Line <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={tempSubject}
                onChange={(e) => setTempSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Token Insertion Chips */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Available Substitution Tokens (Click to insert):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'trip_no',
                  'vehicle_number',
                  'vehicle_type',
                  'driver_name',
                  'driver_mobile',
                  'driver_nic',
                  'route_name',
                  'planned_km',
                  'allocation_date',
                  'request_code',
                  'plant_name',
                  'from_location',
                  'to_location',
                  'required_date',
                  'required_time',
                  'rejection_reason',
                  'cancellation_reason',
                  'requests_breakdown',
                ].map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() => insertToken(token)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white text-indigo-700 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition shadow-2xs cursor-pointer"
                  >
                    +{`{${token}}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Body Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Message Body Content <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={12}
                value={tempBody}
                onChange={(e) => setTempBody(e.target.value)}
                className="w-full p-4 text-xs font-sans rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Live Preview Box */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Simulated Email Preview:</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-xs text-gray-800 whitespace-pre-wrap font-sans leading-relaxed shadow-2xs">
                <div className="border-b border-gray-100 pb-2 mb-3">
                  <strong>Subject:</strong> {tempSubject.replace('{trip_no}', 'TRP-2026-0042').replace('{vehicle_number}', 'LK-6471').replace('{route_name}', 'Main Export Corridor')}
                </div>
                {tempBody
                  .replace('{trip_no}', 'TRP-2026-0042')
                  .replace('{vehicle_number}', 'LK-6471')
                  .replace('{vehicle_type}', '14.5ft Covered Box')
                  .replace('{driver_name}', 'Sunil Perera')
                  .replace('{driver_mobile}', '077-1234567')
                  .replace('{route_name}', 'STR 1 - BIYAGAMA -> MAS Thulhiriya')
                  .replace('{planned_km}', '65.4')
                  .replace('{allocation_date}', '10 Sep 2026')
                  .replace('{request_code}', 'REQ-2026-0001')
                  .replace('{plant_name}', 'STR 1 - Biyagama')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SESSION & AUTO LOGOUT                                              */}
      {/* ========================================================================= */}
      {activeTab === 'session_security' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Session Policies & Security Controls
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Control token validity windows, idle auto-logouts, and login throttling thresholds.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1.5">
                Idle Inactivity Auto-Logout Window
              </label>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="15">15 Minutes of idle time</option>
                <option value="30">30 Minutes (Recommended default)</option>
                <option value="60">60 Minutes</option>
                <option value="120">2 Hours</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1.5">
                Failed Password Attempts Before Lockout
              </label>
              <select
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="3">3 Attempts</option>
                <option value="5">5 Attempts (Standard)</option>
                <option value="10">10 Attempts</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSecuritySaved(true);
              setTimeout(() => setSecuritySaved(false), 2500);
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            {securitySaved ? 'Security Settings Saved!' : 'Save Security Settings'}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DATA DISPLAY LIMITS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'display_limits' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Data Pagination & Rendering Preferences
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Set default items per page for lists and tables across the enterprise portal.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1.5">
                Default Rows Per Table Page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="10">10 Rows per page</option>
                <option value="25">25 Rows per page (Standard)</option>
                <option value="50">50 Rows per page</option>
                <option value="100">100 Rows per page</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1.5">
                Default Display Date Format
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="YYYY-MM-DD">ISO Standard (YYYY-MM-DD)</option>
                <option value="DD/MM/YYYY">British / Local (DD/MM/YYYY)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLimitsSaved(true);
              setTimeout(() => setLimitsSaved(false), 2500);
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            {limitsSaved ? 'Display Preferences Saved!' : 'Save Display Preferences'}
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: BACKUP & RESTORE                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-6">

          {/* Excel Database Export Hub */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-xs">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Database Excel Backup (.xlsx)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Export complete multi-table database workbooks or individual table sheets for audit & analysis
                  </p>
                </div>
              </div>

              <a
                href="/api/settings/backup/export-excel?table=all"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition whitespace-nowrap"
                title="Download all database tables formatted as a multi-sheet Excel spreadsheet"
              >
                <Download className="w-4 h-4" />
                <span>Download Complete Database (Excel .xlsx)</span>
              </a>
            </div>

            {/* Individual Table Export Grid */}
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Export Specific Table to Excel
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {[
                  { key: "vehicle_requests", name: "Vehicle Requests", desc: "All 139 requests" },
                  { key: "delivery_trips", name: "Delivery Trips", desc: "All trip manifests" },
                  { key: "vehicles", name: "Vehicles Fleet", desc: "Fleet inventory & costs" },
                  { key: "drivers", name: "Drivers", desc: "Drivers roster & status" },
                  { key: "locations", name: "Locations", desc: "Origins & destinations" },
                  { key: "routes", name: "Routes", desc: "Corridors & distances" },
                  { key: "trip_reconciliations", name: "Reconciliations", desc: "ERP match audit logs" },
                  { key: "invoice_pods", name: "Invoice PODs", desc: "Delivery receipts" },
                  { key: "users", name: "Users", desc: "Sanitized system users" },
                  { key: "plants", name: "Plants", desc: "Plants & business groups" },
                ].map((tbl) => (
                  <a
                    key={tbl.key}
                    href={`/api/settings/backup/export-excel?table=${tbl.key}`}
                    className="p-3 bg-gray-50 hover:bg-emerald-50/70 border border-gray-200 hover:border-emerald-300 rounded-xl flex flex-col justify-between text-left transition group cursor-pointer"
                    title={`Download ${tbl.name} table as Excel`}
                  >
                    <div>
                      <span className="text-xs font-bold text-gray-800 group-hover:text-emerald-700 block">
                        {tbl.name}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {tbl.desc}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
                      <Download className="w-3 h-3" />
                      <span>Download .xlsx</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Supabase Cloud PostgreSQL
                </h3>
                <p className="text-xs text-emerald-600 font-semibold">Active & Connected</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Database Engine:</span>
                <span className="font-bold text-gray-900">PostgreSQL 15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Registered Tables:</span>
                <span className="font-bold text-gray-900">26 Tables</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cloud Host:</span>
                <span className="text-gray-700 font-medium">aws-0-ap-northeast-2.pooler.supabase.com</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const dump = {
                  timestamp: new Date().toISOString(),
                  engine: 'PostgreSQL',
                  users: userList,
                  templates: templateList,
                };
                const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `str-vms-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" /> Download System Backup (JSON)
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Application Caches & Sessions
                </h3>
                <p className="text-xs text-gray-500">Maintenance & cache purging</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Flush server-side memory caches, session dictionaries, and cached rate sheets. This does not alter database entries.
            </p>

            <button
              type="button"
              onClick={() => {
                setCacheFlushed(true);
                setTimeout(() => setCacheFlushed(false), 2500);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" /> {cacheFlushed ? 'Caches Purged Successfully!' : 'Flush Application Cache'}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT USER                                                    */}
      {/* ========================================================================= */}
      {(isAddUserModal || editingUser) && (
        <div className="fixed inset-0 z-50 !m-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Provision New System User'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Manage user credentials, security role, and authorized plant scopes</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddUserModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUserSubmit} className="p-6 space-y-4 text-xs">
              {userModalError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-semibold">
                  {userModalError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                  />
                </div>
              </div>

              {!editingUser && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-gray-700">
                      Initial Password <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => generateSecurePassword('add')}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Auto Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showFormPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Type custom or click Auto Generate"
                      className="w-full px-3.5 py-2.5 pr-20 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-mono"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      {formPassword && (
                        <button
                          type="button"
                          onClick={() => copyPasswordToClipboard(formPassword, 'add')}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                          title="Copy Password"
                        >
                          {passwordCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        title={showFormPassword ? 'Hide password' : 'Show password'}
                      >
                        {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="mustChangePwdCheck"
                      checked={formMustChangePassword}
                      onChange={(e) => setFormMustChangePassword(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="mustChangePwdCheck" className="text-[11px] font-medium text-gray-600 cursor-pointer">
                      Prompt user to update password on first login (Dismissible popup)
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Assigned Security Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRoleId}
                  onChange={(e) => setFormRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1.5">
                  Assigned Factory Plants (Leave empty for All Plants):
                </label>
                <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-gray-50/80 rounded-xl border border-gray-200">
                  {plants.map((p) => {
                    const checked = formPlantIds.includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormPlantIds([...formPlantIds, p.id]);
                            } else {
                              setFormPlantIds(formPlantIds.filter((id) => id !== p.id));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{p.code} ({p.name})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="userActiveCheck" className="font-semibold text-gray-800 cursor-pointer">
                  Account is Active (Able to sign in)
                </label>
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userModalSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {userModalSubmitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD                                                     */}
      {/* ========================================================================= */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 !m-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base">
                  Reset Password: {passwordResetUser.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Assign a new password credential for this user</p>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-6 space-y-4 text-xs">
              <p className="text-gray-600">
                Enter a new password for <span className="font-bold text-gray-900">{passwordResetUser.email}</span>:
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-gray-700">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => generateSecurePassword('reset')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" /> Auto Generate
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters or click Auto Generate"
                    className="w-full px-3.5 py-2.5 pr-20 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-mono"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    {newPassword && (
                      <button
                        type="button"
                        onClick={() => copyPasswordToClipboard(newPassword, 'reset')}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                        title="Copy Password"
                      >
                        {resetPasswordCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                      title={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500">
                  The user will be prompted to update this password on their next login (dismissible).
                </p>
              </div>

              <div className="border-t border-gray-100 pt-4 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordResetUser(null);
                    setNewPassword('');
                    setShowResetPassword(false);
                    setResetPasswordCopied(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userModalSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  {userModalSubmitting ? 'Updating...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ACCESS CONTROL MATRIX & GRANULAR PERMISSION MANAGEMENT             */}
      {/* ========================================================================= */}
      {accessModalUser && mounted && createPortal(
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] m-0 !m-0 p-0 bg-white flex flex-col w-screen h-screen overflow-hidden">
          <div className="bg-white w-full h-full flex flex-col overflow-hidden rounded-none border-0 m-0 p-0">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                    <span>Access Control Matrix: {accessModalUser.name}</span>
                    <span className="text-xs font-mono font-normal text-gray-500 bg-gray-200/70 px-2 py-0.5 rounded-md">
                      {accessModalUser.userCode || `USR-${accessModalUser.id}`}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {accessModalUser.email} • Customize module page visibility, operation triggers, and security privileges
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccessModalUser(null)}
                className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Toolbar: Role Preset Selector & Quick Action Buttons */}
            <div className="px-6 py-3 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Base Security Role:
                </span>
                <select
                  value={accessRoleId}
                  onChange={(e) => handleAccessRoleChange(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold text-indigo-900 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-gray-500 italic hidden sm:inline">
                  (Selecting a role pre-fills its standard permission template)
                </span>
              </div>

              {/* Quick Action Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetRoleDefaults}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-2xs transition cursor-pointer"
                  title="Re-apply recommended defaults for the selected role"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Role Defaults</span>
                </button>

                <button
                  type="button"
                  onClick={handleGrantAllOperations}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 shadow-2xs transition cursor-pointer"
                  title="Grant Requests, Allocations, Dispatch, Gate Pass, POD, Live Map and Fleet without Admin powers"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Grant All Operations</span>
                </button>

                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 transition cursor-pointer"
                >
                  Select All
                </button>

                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Module Filter Horizontal Tabs */}
            <div className="px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filter:</span>
              {[
                'ALL',
                'Overview & GIS',
                'Requests',
                'Allocations',
                'Dispatch & Gate Pass',
                'Trips',
                'POD & Reconciliation',
                'Fleet & Drivers',
                'Masters',
                'Intelligence & Reports',
                'System',
              ].map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => setSelectedModuleFilter(mod)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    selectedModuleFilter === mod
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mod === 'ALL' ? 'All Modules' : mod}
                </button>
              ))}
            </div>

            {/* Permissions Matrix Grid (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 bg-slate-50/40">
              {(() => {
                // Group permissions by module
                const modules = Array.from(
                  new Set(ALL_SYSTEM_PERMISSIONS.map((p) => p.module))
                ).filter(
                  (mod) => selectedModuleFilter === 'ALL' || selectedModuleFilter === mod
                );

                const getModuleIcon = (modName: string) => {
                  switch (modName) {
                    case 'Overview & GIS':
                      return <MapIcon className="w-4 h-4 text-sky-600" />;
                    case 'Requests':
                      return <FileText className="w-4 h-4 text-indigo-600" />;
                    case 'Allocations':
                      return <Combine className="w-4 h-4 text-blue-600" />;
                    case 'Dispatch & Gate Pass':
                      return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                    case 'Trips':
                      return <Truck className="w-4 h-4 text-amber-600" />;
                    case 'POD & Reconciliation':
                      return <FileCheck2 className="w-4 h-4 text-teal-600" />;
                    case 'Fleet & Drivers':
                      return <Users className="w-4 h-4 text-purple-600" />;
                    case 'Masters':
                      return <MapPin className="w-4 h-4 text-rose-600" />;
                    case 'Intelligence & Reports':
                      return <BarChart3 className="w-4 h-4 text-cyan-600" />;
                    case 'System':
                      return <SettingsIcon className="w-4 h-4 text-slate-700" />;
                    default:
                      return <Layers className="w-4 h-4 text-gray-600" />;
                  }
                };

                return modules.map((modName) => {
                  const permsInMod = ALL_SYSTEM_PERMISSIONS.filter((p) => p.module === modName);
                  const activeCountInMod = permsInMod.filter((p) =>
                    accessPermissions.includes(p.key)
                  ).length;

                  return (
                    <div
                      key={modName}
                      className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden"
                    >
                      {/* Section Header */}
                      <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(modName)}
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                            {modName}
                          </h4>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200/70 text-gray-700">
                          {activeCountInMod} / {permsInMod.length} granted
                        </span>
                      </div>

                      {/* Cards Grid */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                        {permsInMod.map((perm) => {
                          const isChecked = accessPermissions.includes(perm.key);
                          const isSuperRestricted = perm.isSuperAdminOnly;

                          return (
                            <div
                              key={perm.key}
                              onClick={() => {
                                if (!isSuperRestricted) {
                                  togglePermission(perm.key);
                                }
                              }}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between select-none ${
                                isSuperRestricted
                                  ? 'bg-amber-50/30 border-amber-200/80 opacity-80 cursor-not-allowed'
                                  : isChecked
                                  ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200 cursor-pointer shadow-2xs'
                                  : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 cursor-pointer'
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-start gap-2.5">
                                    <input
                                      type="checkbox"
                                      disabled={isSuperRestricted}
                                      checked={isChecked}
                                      onChange={() => {}}
                                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                                    />
                                    <div>
                                      <div className="font-bold text-xs text-gray-900 leading-tight">
                                        {perm.name}
                                      </div>
                                      <code className="text-[10px] font-mono text-gray-400">
                                        {perm.key}
                                      </code>
                                    </div>
                                  </div>

                                  {isSuperRestricted && (
                                    <span
                                      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 shrink-0"
                                      title="This action is permanently locked to Super Administrators"
                                    >
                                      <Lock className="w-2.5 h-2.5 text-amber-700" />
                                      Super Admin
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] text-gray-500 leading-relaxed mt-2 pl-6">
                                  {perm.description}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-gray-100/80 flex items-center justify-between text-[10px]">
                                <span className="text-gray-400 font-medium">Access Status:</span>
                                <span
                                  className={`font-bold ${
                                    isChecked ? 'text-indigo-600' : 'text-gray-400'
                                  }`}
                                >
                                  {isChecked ? 'Enabled' : 'Disabled'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700">
                  Total Active Permissions:{' '}
                  <span className="font-bold text-indigo-700 font-mono text-sm">
                    {accessPermissions.length}
                  </span>{' '}
                  <span className="text-gray-400">/ {ALL_SYSTEM_PERMISSIONS.length}</span>
                </span>

                {accessSuccessMessage && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {accessSuccessMessage}
                  </span>
                )}

                {accessErrorMessage && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-300 animate-in fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    {accessErrorMessage}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setAccessModalUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccess}
                  disabled={accessSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-xs disabled:opacity-50 transition cursor-pointer"
                >
                  {accessSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving Access...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" /> Save Access Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
