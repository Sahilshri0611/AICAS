import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HeatPoint, MapMarker } from "@/types";

export interface MapFilters {
  crime_type?: string;
  risk_level?: string;
  district?: string;
  station?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
}

function clean(f: MapFilters) {
  const p: Record<string, any> = { ...f };
  Object.keys(p).forEach((k) => (p[k] === undefined || p[k] === "" || p[k] === "all") && delete p[k]);
  return p;
}

export function useMapMarkers(filters: MapFilters) {
  return useQuery({
    queryKey: ["map-markers", filters],
    queryFn: async () => {
      const { data } = await api.get<MapMarker[]>("/incidents/map", { params: clean({ limit: 2500, ...filters }) });
      return data;
    },
  });
}

export function useHeatmap(filters: MapFilters, enabled: boolean) {
  return useQuery({
    queryKey: ["heatmap", filters],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<HeatPoint[]>("/incidents/heatmap", { params: clean({ limit: 5000, ...filters }) });
      return data;
    },
  });
}
