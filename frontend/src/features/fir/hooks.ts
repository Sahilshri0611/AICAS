import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FIRDoc, FIRParseResult } from "@/types";

export function useFIRQueue() {
  return useQuery({
    queryKey: ["fir-queue"],
    queryFn: async () => {
      const { data } = await api.get<FIRDoc[]>("/fir-parser/queue");
      return data;
    },
  });
}

export function useUploadFIR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<FIRParseResult>("/fir-parser/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fir-queue"] }),
  });
}

export function useParseText() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<FIRParseResult>("/fir-parser/parse-text", {
        text,
        filename: "manual-entry.txt",
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fir-queue"] }),
  });
}

export function useApproveFIR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, overrides }: { id: number; overrides?: Record<string, any> }) => {
      const { data } = await api.post<FIRDoc>(`/fir-parser/${id}/approve`, { overrides });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fir-queue"] });
      qc.invalidateQueries({ queryKey: ["crimes"] });
    },
  });
}

export function useRetryFIR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post<FIRParseResult>(`/fir-parser/${id}/retry`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fir-queue"] });
    },
  });
}

