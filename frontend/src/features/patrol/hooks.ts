import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PatrolRoute, PatrolBriefing } from "@/types";

export function usePatrolRoutes(stationId?: number, shift?: string) {
  return useQuery({
    queryKey: ["patrol-routes", stationId, shift],
    queryFn: async () => {
      const { data } = await api.get<PatrolRoute[]>("/patrol/routes", {
        params: {
          ...(stationId ? { station_id: stationId } : {}),
          ...(shift ? { shift } : {}),
        },
      });
      return data;
    },
  });
}

export function usePatrolBriefing(routeId: number) {
  return useQuery({
    queryKey: ["patrol-briefing", routeId],
    queryFn: async () => {
      const { data } = await api.get<PatrolBriefing>(`/patrol/briefing/${routeId}`);
      return data;
    },
    enabled: routeId > 0,
  });
}

export function useGenerateRoutes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { shift?: string; station_id?: number }) => {
      const { data } = await api.post<PatrolRoute[]>("/patrol/routes/generate", params || {});
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patrol-routes"] });
    },
  });
}
