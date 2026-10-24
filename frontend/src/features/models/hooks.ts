import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MLModel } from "@/types";

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const { data } = await api.get<MLModel[]>("/models");
      return data;
    },
  });
}

export function useRetrain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (model_type: string) => {
      const { data } = await api.post("/models/retrain", { model_type });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

function useModelAction(action: "activate" | "archive") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/models/${id}/${action}`, {});
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });
}

export const useActivateModel = () => useModelAction("activate");
export const useArchiveModel = () => useModelAction("archive");
