"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Truck,
  Combine,
  Clock,
  CheckCircle2,
  FileCheck2,
  Users,
  Route,
  MapPin,
  Fuel,
  Database,
  BarChart3,
  Map as MapIcon,
  Settings,
  CalendarDays,
  UserCircle,
  ChevronRight,
  CheckSquare,
  FileSpreadsheet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/lib/auth";
import { can } from "@/lib/permission-utils";

interface SidebarProps {
  user: SessionUser | null;
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  collapsed = false,
  onToggle,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const navGroups = [
    {
      title: "OVERVIEW",
      items: [
        {
          name: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
          visible: can(user, "view_dashboard"),
        },
      ],
    },
    {
      title: "REQUESTS",
      items: [
        {
          name: "New Request",
          href: "/requests/create",
          icon: PlusCircle,
          visible: can(user, "create_requests"),
        },
        {
          name: "All Requests",
          href: "/requests",
          icon: FileText,
          visible: can(user, "view_requests"),
        },
      ],
    },
    {
      title: "ALLOCATIONS",
      items: [
        {
          name: "FG & Other Allocation",
          href: "/allocations/fg",
          icon: Truck,
          visible: can(user, "view_allocations"),
        },
        {
          name: "Combine Workbench",
          href: "/allocations/fg/combine",
          icon: Combine,
          visible: can(user, "allocate_trips"),
        },
      ],
    },
    {
      title: "DISPATCH & AUDIT",
      items: [
        {
          name: "Delivery Trips",
          href: "/trips",
          icon: Truck,
          visible: can(user, "view_trips"),
        },
        {
          name: "Datatex Reconcile",
          href: "/reconciliation",
          icon: FileCheck2,
          visible: can(user, "view_reconciliation"),
        },
        {
          name: "POD Management",
          href: "/pod",
          icon: CheckSquare,
          visible: can(user, "manage_pod"),
        },
      ],
    },
    {
      title: "LIVE TRACKING",
      items: [
        {
          name: "Live GIS Map",
          href: "/map",
          icon: MapIcon,
          visible: can(user, "view_map"),
        },
      ],
    },
    {
      title: "FLEET MANAGEMENT",
      items: [
        {
          name: "Vehicles",
          href: "/fleet/vehicles",
          icon: Truck,
          visible: can(user, "view_fleet"),
        },
        {
          name: "Fleet Availability",
          href: "/fleet/availability",
          icon: CalendarDays,
          visible: can(user, "view_fleet"),
        },
        {
          name: "Drivers",
          href: "/fleet/drivers",
          icon: Users,
          visible: can(user, "view_fleet"),
        },
      ],
    },
    {
      title: "MASTERS",
      items: [
        {
          name: "Location Master",
          href: "/locations",
          icon: MapPin,
          visible: can(user, "view_locations"),
        },
        {
          name: "Route Master",
          href: "/routes",
          icon: Route,
          visible: can(user, "view_locations"),
        },
        {
          name: "Master Data",
          href: "/master-data",
          icon: Database,
          visible: can(user, "edit_master_data"),
        },
        {
          name: "Fuel Rate Index",
          href: "/fuel-rates",
          icon: Fuel,
          visible: can(user, "manage_fuel_rates"),
        },
      ],
    },
    {
      title: "INTELLIGENCE & REPORTS",
      items: [
        {
          name: "Executive Analytics",
          href: "/analytics",
          icon: BarChart3,
          visible: can(user, "view_analytics"),
        },
        {
          name: "Data Reports",
          href: "/reports",
          icon: FileSpreadsheet,
          visible: can(user, "view_cost_reports"),
        },
      ],
    },
    {
      title: "SYSTEM",
      items: [
        {
          name: "Settings",
          href: "/settings",
          icon: Settings,
          visible: can(user, "manage_users") || can(user, "manage_mail_templates") || can(user, "manage_backups"),
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)] flex flex-col shrink-0 border-r border-[var(--sidebar-border)] min-h-screen select-none transition-all duration-300 ease-in-out z-50",
        "fixed md:static inset-y-0 left-0",
        mobileOpen ? "translate-x-0 shadow-2xl w-60" : "-translate-x-full md:translate-x-0",
        collapsed ? "md:w-14" : "md:w-52"
      )}
    >
      {/* Brand Header */}
      {collapsed ? (
        <div className="h-14 flex items-center justify-center border-b border-[var(--sidebar-border)] px-2 shrink-0">
          <button
            type="button"
            onClick={onToggle}
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title="Expand sidebar"
          >
            <Truck className="w-5 h-5 text-white transition-transform duration-300 ease-in-out scale-x-[-1]" />
          </button>
        </div>
      ) : (
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[var(--sidebar-border)] shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggle}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 hidden md:flex"
              title="Collapse sidebar"
            >
              <Truck className="w-5 h-5 text-white transition-transform duration-300 ease-in-out scale-x-100" />
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex items-center text-left hover:opacity-85 transition-opacity cursor-pointer select-none min-w-0"
              title="Click to refresh page"
            >
              <span className="font-extrabold text-sm tracking-wider text-white whitespace-nowrap">
                STR TMS
              </span>
            </button>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 md:hidden cursor-pointer"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <div className={cn("flex-1 overflow-y-auto no-scrollbar", collapsed ? "py-3 px-1 space-y-2.5" : "py-3.5 px-2.5 space-y-4")}>
        {navGroups.map((group, gIdx) => {
          const visibleItems = group.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          if (collapsed) {
            return (
              <div key={gIdx} className="space-y-1.5">
                {gIdx > 0 && <div className="my-2 border-t border-white/10 mx-2" />}
                <div className="space-y-1.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : item.href === "/allocations/fg"
                        ? pathname === "/allocations/fg"
                        : item.href === "/requests"
                        ? pathname === "/requests"
                        : pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onCloseMobile}
                        title={item.name}
                        className={cn(
                          "flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-colors group relative",
                          isActive
                            ? "bg-[var(--sidebar-active)] text-white shadow-sm font-semibold"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="sr-only">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1.5">
                {group.title}
              </div>
              <div className="space-y-1.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/"
                      ? pathname === "/"
                      : item.href === "/allocations/fg"
                      ? pathname === "/allocations/fg"
                      : item.href === "/requests"
                      ? pathname === "/requests"
                      : pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors",
                        isActive
                          ? "bg-[var(--sidebar-active)] text-white shadow-sm font-semibold"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Info Footer */}
      {collapsed ? (
        <div className="p-2 border-t border-[var(--sidebar-border)] bg-black/15 flex justify-center shrink-0">
          <Link
            href="/profile"
            onClick={onCloseMobile}
            className="w-8 h-8 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center font-bold text-xs text-indigo-200 hover:opacity-80 transition-opacity"
            title={`${user?.name || "User"} (${user?.roleCode || "USER"})`}
          >
            {user?.name?.charAt(0) || "U"}
          </Link>
        </div>
      ) : (
        <div className="p-2 border-t border-[var(--sidebar-border)] bg-black/15 shrink-0">
          <Link
            href="/profile"
            onClick={onCloseMobile}
            className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/10 transition-colors group"
            title="View Profile & Scopes"
          >
            <div className="w-7 h-7 rounded-full bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center font-bold text-xs text-indigo-200 shrink-0">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-white truncate group-hover:text-indigo-200">
                {user?.name || "Guest"}
              </span>
              <span className="text-[9px] text-slate-400 truncate font-medium uppercase tracking-wider">
                {user?.roleCode || "USER"}
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform shrink-0" />
          </Link>
        </div>
      )}
    </aside>
  );
};
