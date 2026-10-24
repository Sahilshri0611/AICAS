import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DashboardOverview } from "@/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const { data } = await api.get<DashboardOverview>("/analytics/dashboard");
      return data;
    },
  });
}
