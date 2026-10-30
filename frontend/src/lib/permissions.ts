import type { Role, User } from "@/types";

export type Permission =
  | "view_incidents"
  | "create_incident"
  | "edit_incident"
  | "delete_incident"
  | "export_records"
  | "parse_fir"
  | "view_alerts"
  | "manage_alerts"
  | "view_analytics"
  | "manage_models"
  | "view_network"
  | "manage_users"
  | "view_audit";

export const ROLE_LEVEL: Record<Role, number> = {
  officer: 1,
  investigator: 2,
  commander: 3,
  commissioner: 4,
  admin: 5,
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  officer: [
    "view_incidents",
    "create_incident",
    "parse_fir",
    "view_alerts",
    "view_network",
    "view_analytics",
  ],
  investigator: [
    "view_incidents",
    "create_incident",
    "parse_fir",
    "view_alerts",
    "edit_incident",
    "export_records",
    "view_network",
    "view_analytics",
    "manage_alerts",
  ],
  commander: [
    "view_incidents",
    "create_incident",
    "parse_fir",
    "view_alerts",
    "edit_incident",
    "export_records",
    "view_network",
    "view_analytics",
    "manage_alerts",
    "delete_incident",
  ],
  commissioner: [
    "view_incidents",
    "create_incident",
    "parse_fir",
    "view_alerts",
    "edit_incident",
    "export_records",
    "view_network",
    "view_analytics",
    "manage_alerts",
    "delete_incident",
    "view_audit",
  ],
  admin: [
    "view_incidents",
    "create_incident",
    "parse_fir",
    "view_alerts",
    "edit_incident",
    "export_records",
    "view_network",
    "view_analytics",
    "manage_alerts",
    "delete_incident",
    "view_audit",
    "manage_models",
    "manage_users",
  ],
};

export interface RoleDetail {
  title: string;
  shortTitle: string;
  badgeClass: string;
  borderClass: string;
  jurisdiction: string;
  description: string;
}

export const ROLE_DETAILS: Record<Role, RoleDetail> = {
  officer: {
    title: "Police Sub-Inspector (PSI)",
    shortTitle: "Field Officer",
    badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    borderClass: "border-cyan-500/40",
    jurisdiction: "Sitabuldi PS Sector",
    description: "Field beats, FIR intake, incident registration, and tactical patrol dispatch.",
  },
  investigator: {
    title: "Police Inspector (PI)",
    shortTitle: "Investigator / IO",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    borderClass: "border-emerald-500/40",
    jurisdiction: "Crime Branch Nagpur",
    description: "Syndicate network analysis, Modus Operandi Copilot RAG, case file investigations, and evidence custody.",
  },
  commander: {
    title: "Deputy Commissioner of Police (DCP)",
    shortTitle: "Zone Commander",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    borderClass: "border-blue-500/40",
    jurisdiction: "Zone 3 (Old City Nagpur)",
    description: "Tactical zonal deployment, threat escalation, case archival, and inter-station command.",
  },
  commissioner: {
    title: "Commissioner of Police (CP)",
    shortTitle: "Commissioner",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    borderClass: "border-amber-500/40",
    jurisdiction: "Nagpur City HQ, Civil Lines",
    description: "High-level strategic oversight, predictive volume trends, audit inspections, and citywide policy.",
  },
  admin: {
    title: "System Administrator",
    shortTitle: "SysAdmin IT",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    borderClass: "border-purple-500/40",
    jurisdiction: "Police IT & Operations Cell",
    description: "Full clearance: ML model lifecycle management, algorithm retrain/archive, user RBAC, and system health.",
  },
};

/** Pre-configured demo personas matching backend seeds for fast live switching */
export const DEMO_PERSONAS: { user: User; label: string }[] = [
  {
    label: "Officer (Field PSI)",
    user: {
      id: 5,
      email: "officer@crimesense.ai",
      full_name: "Priya Gajbhiye",
      role: "officer",
      badge_number: "PSI-400",
      department: "Sitabuldi Police Station",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    label: "Investigator (Crime Branch PI)",
    user: {
      id: 4,
      email: "investigator@crimesense.ai",
      full_name: "Rahul Meshram",
      role: "investigator",
      badge_number: "PI-300",
      department: "Crime Branch, Nagpur",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    label: "Commander (DCP Zone 3)",
    user: {
      id: 3,
      email: "commander@crimesense.ai",
      full_name: "Sunita Wankhede",
      role: "commander",
      badge_number: "DCP-200",
      department: "Zone 3 (Old City)",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    label: "Commissioner (CP Nagpur)",
    user: {
      id: 2,
      email: "commissioner@crimesense.ai",
      full_name: "Arvind Deshmukh",
      role: "commissioner",
      badge_number: "CP-100",
      department: "Nagpur City Police HQ, Civil Lines",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
  {
    label: "System Admin (Full IT)",
    user: {
      id: 1,
      email: "admin@crimesense.ai",
      full_name: "System Administrator",
      role: "admin",
      badge_number: "ADM-001",
      department: "IT / Operations",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  },
];

/** Check if a role possesses a specific permission */
export function hasPermission(role: Role | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

/** Check if user possesses at least a minimum role level */
export function hasRole(role: Role | undefined | null, minRole: Role): boolean {
  if (!role) return false;
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 99);
}

/**
 * Route-level RBAC map:
 * Defines minimum role required to view and access each route.
 */
export const ROUTE_CLEARANCE: Record<string, { minRole: Role; permission: Permission; label: string }> = {
  "/": { minRole: "officer", permission: "view_incidents", label: "Command Dashboard" },
  "/map": { minRole: "officer", permission: "view_incidents", label: "Incident Map" },
  "/patrol": { minRole: "officer", permission: "view_incidents", label: "Beat Patrol" },
  "/alerts": { minRole: "officer", permission: "view_alerts", label: "Threat Alerts" },
  "/fir": { minRole: "officer", permission: "parse_fir", label: "FIR Parser" },
  "/records": { minRole: "officer", permission: "view_incidents", label: "Crime Records" },
  "/copilot": { minRole: "investigator", permission: "view_analytics", label: "AI Copilot & M.O. RAG" },
  "/analytics": { minRole: "investigator", permission: "view_analytics", label: "Predictive Analytics" },
  "/hotspots": { minRole: "investigator", permission: "view_analytics", label: "Hotspot Intelligence" },
  "/network": { minRole: "officer", permission: "view_network", label: "Network Analysis" },
  "/evidence": { minRole: "investigator", permission: "view_incidents", label: "Evidence Vault" },
  "/models": { minRole: "admin", permission: "manage_models", label: "Model Management" },
  "/settings": { minRole: "officer", permission: "view_incidents", label: "Settings" },
};

export function canAccessRoute(role: Role | undefined | null, path: string): boolean {
  if (!role) return true;
  const config = ROUTE_CLEARANCE[path];
  if (!config) return true;
  return hasRole(role, config.minRole);
}
