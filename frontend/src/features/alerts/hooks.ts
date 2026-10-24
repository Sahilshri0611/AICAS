import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Alert, Page } from "@/types";

interface AlertFilters {
  status?: string;
  severity?: string;
  category?: string;
  page?: number;
}

export function useAlerts(filters: AlertFilters = {}) {
  return useQuery({
    queryKey: ["alerts", filters],
    queryFn: async () => {
      const { data } = await api.get<Page<Alert>>("/alerts", {
        params: { ...filters, page: filters.page ?? 1, page_size: 50 },
      });
      return data;
    },
  });
}

export function useAlertDashboard() {
  return useQuery({
    queryKey: ["alerts", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/alerts/dashboard");
      return data as {
        active_count: number;
        severity_distribution: { level: string; count: number }[];
        trend: { label: string; value: number }[];
      };
    },
  });
}

/** Small badge count for the topbar (active alerts). */
export function useAlertBadge() {
  const { data } = useQuery({
    queryKey: ["alerts", "dashboard"],
    queryFn: async () => {
      const { data } = await api.get("/alerts/dashboard");
      return data as { active_count: number };
    },
    refetchInterval: 60_000,
  });
  return data?.active_count ?? 0;
}

function useAlertAction(action: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body?: any }) => {
      const { data } = await api.post<Alert>(`/alerts/${id}/${action}`, body ?? {});
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}

export const useAcknowledgeAlert = () => useAlertAction("acknowledge");
export const useCloseAlert = () => useAlertAction("close");
export const useAssignAlert = () => useAlertAction("assign");

export function useAddAlertNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: number; body: string }) => {
      const { data } = await api.post<Alert>(`/alerts/${id}/notes`, { body });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
}
