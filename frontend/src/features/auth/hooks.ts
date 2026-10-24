import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types";

interface AuthResponse {
  user: User;
  tokens: { access_token: string; refresh_token: string; token_type: string };
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      const { data } = await api.post<AuthResponse>("/auth/login", payload);
      return data;
    },
    onSuccess: (data) => {
      setSession(data.user, data.tokens.access_token, data.tokens.refresh_token);
    },
  });
}
