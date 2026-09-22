"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Palette,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Building2,
  Check,
  Shield,
  KeyRound,
  History,
  Settings,
  CheckCheck,
  ArrowRight,
  Truck,
  FileText,
  AlertCircle,
  ExternalLink,
  Menu,
} from "lucide-react";
import { useTheme, ThemeMode } from "./ThemeContext";
import { SessionUser } from "@/lib/auth";

interface HeaderProps {
  user: SessionUser | null;
  unreadNotifications?: number;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

interface MiniNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  isRead: number;
  createdAt: string;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  unreadNotifications = 0,
  sidebarCollapsed = false,
  onToggleSidebar,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  // Dropdown states
  const [themeOpen, setThemeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Notifications live state
  const [unreadCount, setUnreadCount] = useState(unreadNotifications);
  const [recentNotifications, setRecentNotifications] = useState<MiniNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Refs for clicking outside
  const themeRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUnreadCount(unreadNotifications);
  }, [unreadNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch recent notifications when dropdown opens
  const handleToggleNotifications = async () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) {
      setLoadingNotifs(true);
      try {
        const res = await fetch("/api/notifications");
        const json = await res.json();
        if (json.status === "success") {
          setRecentNotifications((json.notifications || []).slice(0, 5));
          setUnreadCount(json.unreadCount ?? 0);
        }
      } catch (err) {
        console.error("Failed to load notifications preview:", err);
      } finally {
        setLoadingNotifs(false);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
      router.refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkOneRead = async (n: MiniNotification) => {
    if (n.isRead === 0) {
      try {
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: n.id }),
        });
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setRecentNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: 1 } : item))
        );
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    }
    setNotificationsOpen(false);
    if (n.linkUrl) {
      router.push(n.linkUrl);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const themeOptions: Array<{ id: ThemeMode; label: string; desc: string }> = [
    { id: "material", label: "Material Indigo", desc: "Default Navy & Indigo" },
    { id: "light", label: "Enterprise Light", desc: "Clean Corporate Styling" },
    { id: "dark", label: "Dark Mode", desc: "High Contrast Dark Mode" },
  ];

  const getNotifIcon = (type: string) => {
    if (type.includes("TRIP") || type.includes("ALLOCATION")) {
      return <Truck className="w-3.5 h-3.5 text-indigo-600" />;
    }
    if (type.includes("REQUEST")) {
      return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
    }
    return <AlertCircle className="w-3.5 h-3.5 text-amber-600" />;
  };

  const formatRelativeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getPageTitle = (path: string) => {
    if (path === "/") return "Executive Dashboard";
    if (path.startsWith("/allocations/fg/combine/")) return "Combine Workbench";
    if (path === "/allocations/fg/combine") return "Combine Trips Registry";
    if (path === "/allocations/fg") return "FG & Other Allocation Hub";
    if (path === "/requests/create") return "Create Transport Request";
    if (path.startsWith("/requests/")) return "Request Details";
    if (path === "/requests") return "All Transport Requests";
    if (path === "/routes") return "Route Master & Multi-Stop Sequencing";
    if (path === "/locations") return "Location Master";
    if (path === "/trips") return "Delivery Trips";
    if (path.startsWith("/trips/")) return "Trip Details";
    if (path === "/dispatch/daily-summary") return "Daily Operations";
    if (path === "/reconciliation") return "Datatex Commercial Invoice Reconciliation";
    if (path === "/pod") return "POD Management";
    if (path === "/fleet/vehicles") return "Commercial Fleet Vehicles";
    if (path === "/fleet/drivers") return "Commercial Fleet Drivers";
    if (path === "/fleet/availability") return "Fleet Availability";
    if (path === "/fuel-rates") return "Monthly Fuel Rate Index";
    if (path === "/master-data") return "Master Data Configuration";
    if (path === "/settings") return "System Administration";
    if (path === "/analytics") return "Logistics Analytics";
    if (path === "/notifications") return "System Notifications";
    if (path === "/map") return "Live GIS Geolocation & Routes";
    if (path === "/profile") return "User Profile";
    return "Enterprise Logistics";
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4 sticky top-0 z-30 shadow-2xs">
      {/* Left: Mobile Hamburger & Desktop Dynamic Page Title */}
      <div className="flex items-center min-w-0 gap-2">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 md:hidden cursor-pointer shrink-0"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        {/* Dynamic Page Title: Hidden on mobile (< md), visible on desktop (>= md) */}
        <div className="hidden md:flex items-center gap-1.5 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 rounded-lg shrink-0">
          <span className="text-xs font-bold text-indigo-900 tracking-tight whitespace-nowrap">
            {getPageTitle(pathname)}
          </span>
        </div>
      </div>

      {/* Right: Theme Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-2.5">
        {/* Theme Picker Dropdown */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => setThemeOpen(!themeOpen)}
            className="flex items-center gap-2 p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-xs font-medium transition-colors cursor-pointer"
            title="Change UI Theme"
          >
            <Palette className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline capitalize">{theme}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {themeOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Select Theme
              </div>
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setThemeOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{opt.label}</span>
                    <span className="text-[10px] text-gray-500">{opt.desc}</span>
                  </div>
                  {theme === opt.id && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleToggleNotifications}
            className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Items */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {loadingNotifs ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    Loading alerts...
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 space-y-1">
                    <Bell className="w-6 h-6 mx-auto opacity-30 text-gray-400" />
                    <p>No new notifications</p>
                  </div>
                ) : (
                  recentNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleMarkOneRead(n)}
                      className={`p-3 text-xs flex items-start gap-2.5 transition-colors cursor-pointer ${
                        n.isRead === 0
                          ? "bg-indigo-50/30 hover:bg-indigo-50/60"
                          : "hover:bg-gray-50 text-gray-600"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border ${
                          n.isRead === 0
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                            : "bg-gray-100 border-gray-200 text-gray-400"
                        }`}
                      >
                        {getNotifIcon(n.type)}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`truncate ${
                              n.isRead === 0 ? "font-bold text-gray-900" : "font-medium text-gray-700"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
                            {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-2 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                <Link
                  href="/notifications"
                  onClick={() => setNotificationsOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 rounded-lg hover:bg-indigo-50/50 transition-colors"
                >
                  <span>View All in Notifications Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col text-left min-w-0 hidden md:flex">
              <span className="text-xs font-semibold text-gray-900 truncate max-w-[120px]">
                {user?.name || "User"}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                {user?.roleCode || "ROLE"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* User Banner */}
              <div className="px-4 py-3 border-b border-gray-100 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wider uppercase">
                    {user?.roleCode}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
              </div>

              {/* Sub-Options matching PHP ProfileController */}
              <div className="py-1">
                <Link
                  href="/profile?tab=overview"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5 text-gray-400" />
                  <span>My Profile & Info</span>
                </Link>

                <Link
                  href="/profile?tab=scopes"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  <span>Plant & Operational Scopes</span>
                </Link>

                <Link
                  href="/profile?tab=permissions"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  <span>Permissions Matrix (15 Grants)</span>
                </Link>

                <Link
                  href="/profile?tab=password"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                  <span>Change Password</span>
                </Link>

                <Link
                  href="/profile?tab=activity"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-gray-400" />
                  <span>Personal Activity Logs</span>
                </Link>
              </div>

              <div className="border-t border-gray-100 my-1" />

              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-gray-400" />
                  <span>System Settings</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
