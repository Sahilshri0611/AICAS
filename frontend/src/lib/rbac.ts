import { useAuthStore } from "@/store/auth";
import type { Role } from "@/types";

// Mirrors backend/app/core/rbac.py (higher level inherits lower permissions).
const LEVEL: Record<Role, number> = { officer: 1, investigator: 2, commander: 3, commissioner: 4, admin: 5 };

export function useCan() {
  const role = useAuthStore((s) => s.user?.role);
  const level = role ? LEVEL[role] ?? 0 : 0;
  return {
    createIncident: level >= 1,
    editIncident: level >= 2,
    deleteIncident: level >= 3,
  };
}
