import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NetworkGraph } from "@/types";

export function useNetwork(limit = 250) {
  return useQuery({
    queryKey: ["network", limit],
    queryFn: async () => {
      const { data } = await api.get<NetworkGraph>("/network/graph", { params: { limit } });
      return data;
    },
  });
}
