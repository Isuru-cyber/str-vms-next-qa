"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  User as UserIcon,
  Shield,
  KeyRound,
  History,
  Building2,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Palette,
  Check,
  Lock,
  Compass,
  FileText,
  Truck,
  ArrowRightLeft,
  MapPin,
  ListOrdered,
  Car,
  PieChart,
  Users,
  Mail,
  HardDrive,
  Database,
  Fuel,
  Sparkles,
} from "lucide-react";
import { useTheme, ThemeMode } from "@/components/layout/ThemeContext";

interface UserScopePlant {
  plant: {
    id: number;
    code: string;
    name: string;
    businessGroup: string | null;
  };
}

interface UserScopeOperation {
  operation: {
    id: number;
    code: string;
    name: string;
  };
}

interface UserScopeSubOperation {
  subOperation: {
    id: number;
    code: string;
    name: string;
  };
}

interface ActivityLogItem {
  id: number;
  action: string;
  module: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string | Date;
}

interface UserProfileData {
  id: number;
  userCode: string | null;
  name: string;
  email: string;
  roleId: number;
  role: {
    id: number;
    code: string;
    name: string;
    description: string | null;
  };
  active: number;
  createdAt: string | Date;
  plants: UserScopePlant[];
  operations: UserScopeOperation[];
  subOperations: UserScopeSubOperation[];
  permissions: Array<{ permissionKey: string }>;
  activityLogs: ActivityLogItem[];
}

interface ProfileConsoleProps {
  user: UserProfileData;
}

export const ProfileConsole: React.FC<ProfileConsoleProps> = ({ user }) => {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  const { theme, setTheme } = useTheme();

  // Sync tab with query param if it changes
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && ["overview", "scopes", "permissions", "password", "activity"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwSuccessMsg, setPwSuccessMsg] = useState("");
  const [pwErrorMsg, setPwErrorMsg] = useState("");

  const themeOptions: Array<{ id: ThemeMode; label: string; desc: string; colors: string[] }> = [
    { id: "material", label: "Material Indigo", desc: "Default Navy sidebar with vibrant Indigo accent", colors: ["#1E1B4B", "#4F46E5", "#EEF2F7"] },
    { id: "light", label: "Enterprise Light", desc: "Clean corporate white with royal blue headers", colors: ["#0F2747", "#2563EB", "#FFFFFF"] },
    { id: "dark", label: "Dark Mode", desc: "Full executive high-contrast dark theme", colors: ["#0B0F19", "#6366F1", "#1E293B"] },
  ];

  // 15 Granular Permissions
  const permissionDefinitions = [
    { key: "view_dashboard", label: "Dashboard & KPIs", module: "Overview", icon: Compass, desc: "View operational metrics, dispatch stats & KPIs" },
    { key: "create_requests", label: "Create Requests", module: "Requests", icon: FileText, desc: "Submit new FG and Shuttle vehicle requests" },
    { key: "dispatch_trips", label: "Vehicle Allocation", module: "Allocations", icon: Truck, desc: "Assign fleet vehicles & drivers to requests" },
    { key: "dispatch_audit", label: "Dispatch & Audit", module: "Operations", icon: ArrowRightLeft, desc: "FG Dispatch Deck, Datatex Reconcile & Control Tower" },
    { key: "allocate_trips", label: "Trip Combination", module: "Allocations", icon: Layers, desc: "Merge multiple requests into multi-drop trips" },
    { key: "view_map", label: "Live Fleet Map", module: "Tracking", icon: MapPin, desc: "Real-time vehicle map tracking and routes" },
    { key: "view_trips", label: "View Trips", module: "Trips", icon: ListOrdered, desc: "Browse and inspect delivery trip details" },
    { key: "manage_fleet", label: "Manage Fleet", module: "Fleet", icon: Car, desc: "Vehicle & driver masters, specs and licenses" },
    { key: "manage_locations", label: "Location Master", module: "Masters", icon: Building2, desc: "Origin plants, destination hubs & coordinates" },
    { key: "view_analytics", label: "Analytics & Costs", module: "Reports", icon: PieChart, desc: "Financial metrics, fuel expenditure & vendor statements" },
    { key: "manage_users", label: "User Management", module: "Administration", icon: Users, desc: "Manage users, access scopes & roles" },
    { key: "manage_mail_templates", label: "Mail Templates", module: "Administration", icon: Mail, desc: "Customize Outlook email notification templates" },
    { key: "manage_backups", label: "Database Backups", module: "Administration", icon: HardDrive, desc: "Export and download database backups" },
    { key: "edit_master_data", label: "Master Data Control", module: "Super Admin", icon: Database, desc: "System master lists and categories" },
    { key: "manage_fuel_rates", label: "Monthly Fuel Rates", module: "Super Admin", icon: Fuel, desc: "Fuel pricing and rate indexing" },
  ];

  const userPermKeys = new Set(user.permissions.map((p) => p.permissionKey));
  const isSuperAdmin = user.role.code === "SUPER_ADMIN";

  const isGranted = (key: string) => {
    if (isSuperAdmin) return true;
    return userPermKeys.has(key);
  };

  // Password strength helper
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { score: 0, text: "", color: "bg-gray-200" };
    let score = 0;
    if (pw.length >= 6) score += 1;
    if (pw.length >= 10) score += 1;
    if (/[A-Z]/.test(pw)) score += 1;
    if (/[0-9]/.test(pw)) score += 1;
    if (/[^A-Za-z0-9]/.test(pw)) score += 1;

    if (score <= 2) return { score: 1, text: "Weak", color: "bg-rose-500" };
    if (score <= 3) return { score: 2, text: "Fair", color: "bg-amber-500" };
    if (score <= 4) return { score: 3, text: "Good", color: "bg-blue-500" };
    return { score: 4, text: "Strong", color: "bg-emerald-500" };
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSubmitting(true);
    setPwSuccessMsg("");
    setPwErrorMsg("");

    if (newPassword !== confirmPassword) {
      setPwErrorMsg("New password and confirmation do not match.");
      setPwSubmitting(false);
      return;
    }

    if (newPassword.length < 6) {
      setPwErrorMsg("New password must be at least 6 characters long.");
      setPwSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setPwErrorMsg(data.message || "Failed to update password.");
        return;
      }

      setPwSuccessMsg(data.message || "Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setPwSubmitting(false);
    }
  };

  const tabs = [
    { id: "overview", label: "My Profile & Themes", icon: UserIcon },
    { id: "scopes", label: "Access Scopes", icon: Building2 },
    { id: "permissions", label: "Permissions Matrix", icon: Shield },
    { id: "password", label: "Change Password", icon: KeyRound },
    { id: "activity", label: "Activity Logs", icon: History },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md ring-4 ring-indigo-50 shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{user.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-tight tabular-nums">
                {user.userCode || `USR-${String(user.id).padStart(4, "0")}`}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Account
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700">
                {user.role.name} ({user.role.code})
              </span>
              <span className="text-xs text-gray-400">
                Member since {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Global Scope Tag */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-right w-full sm:w-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
            Plant Access Level
          </span>
          <span className="text-xs font-bold text-indigo-700 mt-0.5 block">
            {isSuperAdmin ? "GLOBAL ACCESS (ALL 5 PLANTS)" : `${user.plants.length} Assigned Plant(s)`}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all shrink-0 cursor-pointer ${
                isActive
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & THEMES */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Theme Switcher */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-gray-900">Workspace UI Theme Personalization</h2>
            </div>
            <p className="text-xs text-gray-500">
              Customize your dashboard appearance. Themes change instantly and persist in your browser session.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    theme === opt.id
                      ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20 shadow-xs"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900">{opt.label}</span>
                      {theme === opt.id && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1">{opt.desc}</p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    {opt.colors.map((c, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-gray-200 shadow-xs"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Account Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Account Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-400 font-semibold text-[10px] uppercase">Full Name</span>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-400 font-semibold text-[10px] uppercase">Email Address</span>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-400 font-semibold text-[10px] uppercase">Role Authorization</span>
                <p className="font-medium text-gray-900">{user.role.name} ({user.role.code})</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-gray-400 font-semibold text-[10px] uppercase">User System Code</span>
                <p className="font-medium text-indigo-700 tracking-tight">{user.userCode || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ACCESS SCOPES */}
      {activeTab === "scopes" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Operational Scopes & Plant Clearances
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Your account is partitioned to specific manufacturing facilities, production operations, and sub-operation groups.
              </p>
            </div>

            {/* Plants */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Assigned Manufacturing Plants
              </span>
              {isSuperAdmin ? (
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Global Administrator Scope:</strong> You have unrestricted multi-plant access across all facilities (STR1 Biyagama, STR2, STR3, STR4, STR5).
                  </span>
                </div>
              ) : user.plants.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-4 bg-gray-50 rounded-xl">No individual plants assigned.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {user.plants.map((up) => (
                    <div key={up.plant.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {up.plant.code}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{up.plant.name}</p>
                        <p className="text-[10px] text-gray-500">{up.plant.businessGroup || "ELASTIC"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operations */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Assigned Operations
              </span>
              {isSuperAdmin ? (
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  Global clearance across all operational domains.
                </p>
              ) : user.operations.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">All operations accessible by default.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.operations.map((uo) => (
                    <span key={uo.operation.id} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-semibold text-gray-800 border border-gray-200">
                      {uo.operation.name} ({uo.operation.code})
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Sub-Operations */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Assigned Sub-Operations (Cargo Classification)
              </span>
              {isSuperAdmin ? (
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  Global clearance across FG (Finished Goods), RM (Raw Materials), Yarn, and Shuttle cargo.
                </p>
              ) : user.subOperations.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">All sub-operations accessible.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.subOperations.map((uso) => (
                    <span key={uso.subOperation.id} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700 border border-indigo-200">
                      {uso.subOperation.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PERMISSIONS MATRIX (15 GRANTS) */}
      {activeTab === "permissions" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Role Permissions & Capabilities Matrix (15 Grants)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Granular capability inspection derived from role <span className="font-semibold text-gray-800">{user.role.name}</span> and custom overrides.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {permissionDefinitions.map((perm) => {
                const granted = isGranted(perm.key);
                const Icon = perm.icon;
                return (
                  <div
                    key={perm.key}
                    className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      granted
                        ? "bg-white border-gray-200 hover:border-indigo-200 shadow-2xs"
                        : "bg-gray-50/70 border-gray-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          granted
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{perm.label}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-gray-100 text-gray-600">
                            {perm.module}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug">{perm.desc}</p>
                        <span className="text-[10px] text-gray-400 block pt-0.5">
                          Key: {perm.key}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 pt-0.5">
                      {granted ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Granted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          <Lock className="w-3 h-3" />
                          <span>Restricted</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CHANGE PASSWORD */}
      {activeTab === "password" && (
        <div className="max-w-xl mx-auto">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Update Account Password
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Enter your current credentials to verify identity, then establish a strong new password.
              </p>
            </div>

            {pwSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pwSuccessMsg}</span>
              </div>
            )}

            {pwErrorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{pwErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 pr-10 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 pr-10 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="pt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 font-semibold">
                      <span>Password Strength</span>
                      <span className="font-bold">{getPasswordStrength(newPassword).text}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getPasswordStrength(newPassword).color}`}
                        style={{ width: `${(getPasswordStrength(newPassword).score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="submit"
                  disabled={pwSubmitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {pwSubmitting ? "Updating Password..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: ACTIVITY LOGS */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Personal Activity & Security Trail
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Recent actions, logins, updates, and dispatches performed under your user account.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {user.activityLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-xs">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No recent activity records found.</p>
                </div>
              ) : (
                user.activityLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-gray-50/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[10px] tracking-tight">
                          {log.action}
                        </span>
                        {log.module && (
                          <span className="text-gray-500 font-semibold text-[10px] uppercase">
                            [{log.module}]
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800 leading-snug">{log.details || "No details provided"}</p>
                    </div>

                    <div className="text-right shrink-0 space-y-0.5">
                      <span className="text-[10px] text-gray-400 block tabular-nums">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {log.ipAddress && (
                        <span className="text-[10px] text-gray-400 block tabular-nums">
                          IP: {log.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
