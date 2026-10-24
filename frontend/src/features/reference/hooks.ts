import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CrimeHead, Geography } from "@/types";

export function useGeography() {
  return useQuery({
    queryKey: ["reference", "geography"],
    queryFn: async () => (await api.get<Geography>("/reference/geography")).data,
    staleTime: Infinity,
  });
}

export function useCrimeHeads() {
  return useQuery({
    queryKey: ["reference", "crime-heads"],
    queryFn: async () => (await api.get<CrimeHead[]>("/reference/crime-heads")).data,
    staleTime: Infinity,
  });
}
