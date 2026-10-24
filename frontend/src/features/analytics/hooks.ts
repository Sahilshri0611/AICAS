import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PredictiveAnalytics } from "@/types";

export function usePredictive() {
  return useQuery({
    queryKey: ["predictive"],
    queryFn: async () => {
      const { data } = await api.get<PredictiveAnalytics>("/analytics/predictive");
      return data;
    },
  });
}
