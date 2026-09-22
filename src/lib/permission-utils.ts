import type { SessionUser } from "./auth";

/**
 * Super Admin Exclusive Actions
 * In the PHP VMS core (Auth::can), these four actions are hard-denied to everyone except SUPER_ADMIN,
 * even if custom permissions or ADMIN role are granted.
 */
export const SUPER_ADMIN_EXCLUSIVE_ACTIONS = [
  "edit_master_data",
  "manage_fuel_rates",
  "manage_backups",
  "delete_trips",
] as const;

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  module: string;
  isSuperAdminOnly?: boolean;
}

export const ALL_SYSTEM_PERMISSIONS: PermissionDefinition[] = [
  // 1. Overview & Live GIS Tracking
  { key: "view_dashboard", name: "Dashboard Overview", description: "View KPI cards, fleet status and operational metrics", module: "Overview & GIS" },
  { key: "view_map", name: "Live GIS Map Tracking", description: "Live real-time GIS map visualization and vehicle telemetry", module: "Overview & GIS" },

  // 2. Transport Requests
  { key: "view_requests", name: "View Requests Registry", description: "Search, filter and view transport requests and tracking history", module: "Requests" },
  { key: "create_requests", name: "Create Transport Requests", description: "Enter and submit new logistics requests via creation wizard", module: "Requests" },
  { key: "edit_requests", name: "Edit Active Requests", description: "Modify draft, submitted, or pending transport requests", module: "Requests" },
  { key: "cancel_requests", name: "Cancel / Reject Requests", description: "Reject pending requests or cancel non-allocated requests", module: "Requests" },

  // 3. Allocations & Combine
  { key: "view_allocations", name: "View Allocations Hub", description: "View FG and combine allocation workbenches", module: "Allocations" },
  { key: "allocate_trips", name: "Combine & Allocate Cargo", description: "Consolidate multiple orders and assign fleet vehicles/drivers", module: "Allocations" },
  { key: "cancel_allocations", name: "Split / Revert Allocations", description: "De-allocate cargo and return requests to pending queue", module: "Allocations" },

  // 4. Dispatch & Gate Pass
  { key: "view_dispatch", name: "View Dispatch Deck", description: "View loading queue, ready trips and loading bays", module: "Dispatch & Gate Pass" },
  { key: "dispatch_trips", name: "Dispatch Fleet to Bay", description: "Confirm allocation dispatch to physical loading bays", module: "Dispatch & Gate Pass" },
  { key: "issue_gate_pass", name: "Security Gate Pass & Odo", description: "Issue security gate pass numbers, seal codes, and record odometers", module: "Dispatch & Gate Pass" },
  { key: "dispatch_audit", name: "Dispatch Audit & Overrides", description: "Audit security clearances and resolve dispatch exceptions", module: "Dispatch & Gate Pass" },

  // 5. Delivery Trips Registry
  { key: "view_trips", name: "View Delivery Trips", description: "View full registry of active and historical trips and manifest details", module: "Trips" },
  { key: "delete_trips", name: "Cancel / Abort Trips", description: "Permanently cancel or abort active delivery trips", module: "Trips", isSuperAdminOnly: true },

  // 6. Reconciliation & POD
  { key: "view_reconciliation", name: "View Reconciliation Hub", description: "Access Datatex trip reconciliation and settlement status", module: "POD & Reconciliation" },
  { key: "manage_pod", name: "Upload & Verify POD", description: "Upload signed delivery notes and customer acknowledgment receipts", module: "POD & Reconciliation" },
  { key: "finalize_reconciliation", name: "Finalize Datatex Billing", description: "Lock and finalize billing reconciliations with ERP", module: "POD & Reconciliation" },

  // 7. Fleet & Drivers
  { key: "view_fleet", name: "View Fleet & Drivers", description: "View company vehicles, availability roster and driver profiles", module: "Fleet & Drivers" },
  { key: "manage_fleet", name: "Manage Fleet & Drivers", description: "Register, modify vehicle specs, costing rates and driver profiles", module: "Fleet & Drivers" },

  // 8. Locations & Corridors
  { key: "view_locations", name: "View Locations & Routes", description: "View plants, customer delivery locations and corridor routes", module: "Masters" },
  { key: "manage_locations", name: "Manage Locations & Routes", description: "Add/edit delivery locations, route corridors and km matrices", module: "Masters" },

  // 9. Intelligence & Reports
  { key: "view_analytics", name: "Operational Analytics", description: "View operational charts, on-time delivery KPIs and volume metrics", module: "Intelligence & Reports" },
  { key: "view_cost_reports", name: "Financial Cost Reports", description: "Access consolidated financial reports, hire rates and margins", module: "Intelligence & Reports" },

  // 10. System Administration
  { key: "manage_users", name: "User Accounts & Security", description: "Provision user accounts, reset credentials, and configure access permissions", module: "System" },
  { key: "edit_master_data", name: "Master Data Hub (Plants/SubOps)", description: "Manage factory plants, sub-operations and vehicle default baselines", module: "System", isSuperAdminOnly: true },
  { key: "manage_fuel_rates", name: "Fuel Rates Setup", description: "Configure national fuel price indices and pricing formulas", module: "System", isSuperAdminOnly: true },
  { key: "manage_mail_templates", name: "Email Notification Templates", description: "Customize automated dispatch notification email templates", module: "System" },
  { key: "manage_backups", name: "Database System Backups", description: "Generate and download enterprise database snapshots", module: "System", isSuperAdminOnly: true },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: ALL_SYSTEM_PERMISSIONS.map((p) => p.key),
  ADMIN: [
    "view_dashboard",
    "view_map",
    "view_requests",
    "create_requests",
    "edit_requests",
    "cancel_requests",
    "view_allocations",
    "allocate_trips",
    "cancel_allocations",
    "view_dispatch",
    "dispatch_trips",
    "issue_gate_pass",
    "dispatch_audit",
    "view_trips",
    "view_reconciliation",
    "manage_pod",
    "finalize_reconciliation",
    "view_fleet",
    "manage_fleet",
    "view_locations",
    "manage_locations",
    "view_analytics",
    "view_cost_reports",
    "manage_users",
    "manage_mail_templates",
  ],
  POWER_USER: [
    "view_dashboard",
    "view_map",
    "view_requests",
    "create_requests",
    "edit_requests",
    "view_allocations",
    "allocate_trips",
    "cancel_allocations",
    "view_dispatch",
    "dispatch_trips",
    "issue_gate_pass",
    "dispatch_audit",
    "view_trips",
    "view_reconciliation",
    "manage_pod",
    "view_fleet",
    "view_locations",
    "view_analytics",
  ],
  DISPATCHER: [
    "view_dashboard",
    "view_map",
    "view_requests",
    "create_requests",
    "view_allocations",
    "allocate_trips",
    "view_dispatch",
    "dispatch_trips",
    "issue_gate_pass",
    "view_trips",
    "view_fleet",
    "view_locations",
  ],
  ENTRY_USER: [
    "view_dashboard",
    "view_requests",
    "create_requests",
    "edit_requests",
    "view_locations",
  ],
  VIEW_USER: [
    "view_dashboard",
    "view_map",
    "view_requests",
    "view_trips",
    "view_fleet",
    "view_locations",
    "view_analytics",
  ],
};

export function getRoleDefaultPermissions(roleCode: string): string[] {
  return DEFAULT_ROLE_PERMISSIONS[roleCode] || [];
}

/**
 * Core permission check matching PHP Auth::can($action)
 */
export function can(user: SessionUser | null, permission: string): boolean {
  if (!user) return false;

  // Super Admin has full company-wide access to all actions UNLESS custom permissions are explicitly configured
  if (user.roleCode === "SUPER_ADMIN" && !user.hasCustomPermissions) return true;

  // Hard deny super-admin-exclusive actions to all non-Super-Admin roles
  if (user.roleCode !== "SUPER_ADMIN" && (SUPER_ADMIN_EXCLUSIVE_ACTIONS as readonly string[]).includes(permission)) {
    return false;
  }

  // If user has custom permissions explicitly configured by Admin in Access Control Matrix:
  if (user.hasCustomPermissions) {
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
  }

  // Otherwise, fall back to default role permissions
  const rolePerms = DEFAULT_ROLE_PERMISSIONS[user.roleCode] || [];
  return rolePerms.includes(permission);
}

export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.roleCode === "SUPER_ADMIN";
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.roleCode === "SUPER_ADMIN" || user?.roleCode === "ADMIN";
}

export function isDispatcher(user: SessionUser | null): boolean {
  const role = user?.roleCode || "";
  return ["SUPER_ADMIN", "ADMIN", "POWER_USER", "DISPATCHER"].includes(role);
}

export function isRequester(user: SessionUser | null): boolean {
  return user?.roleCode === "ENTRY_USER";
}

export function isAuditor(user: SessionUser | null): boolean {
  return user?.roleCode === "VIEW_USER";
}

/**
 * Enforces role management hierarchy matching PHP Auth::canManageRole($targetRoleCode)
 * Prevents privilege escalation (S-3)
 */
export function canManageRole(currentUser: SessionUser | null, targetRoleCode: string): boolean {
  if (!currentUser) return false;
  if (currentUser.roleCode === "SUPER_ADMIN") {
    return true;
  }
  if (currentUser.roleCode === "ADMIN") {
    // Admins cannot create, edit, or delete Super Admins or other Admins
    return !["SUPER_ADMIN", "ADMIN"].includes(targetRoleCode);
  }
  return false;
}

/**
 * Scoped plant access check matching PHP Auth::canAccessPlant($plantId)
 */
export function canAccessPlant(user: SessionUser | null, plantId: number): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return Array.isArray(user.plantIds) && user.plantIds.includes(Number(plantId));
}
