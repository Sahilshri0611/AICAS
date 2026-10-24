import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types";

export function usePermissionMatrix() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data } = await api.get<Record<string, string[]>>("/auth/permissions");
      return data;
    },
    staleTime: 10 * 60_000,
  });
}

export function useUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["users"],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<User[]>("/auth/users");
      return data;
    },
  });
}
