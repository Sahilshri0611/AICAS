import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { HotspotResponse } from "@/types";

export function useHotspots(top = 10) {
  return useQuery({
    queryKey: ["hotspots", top],
    queryFn: async () => {
      const { data } = await api.get<HotspotResponse>("/analytics/hotspots", { params: { top } });
      return data;
    },
  });
}
