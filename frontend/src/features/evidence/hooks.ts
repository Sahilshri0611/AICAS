import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CustodyEvent, MaterialEvidence } from "@/types";

export interface EvidenceVerification {
  verified: boolean;
  file_hash: string;
  computed_hash?: string;
  match?: boolean;
  timestamp?: string;
  message?: string;
}

export function useMaterialEvidence(params?: {
  item_type?: string;
  custody_status?: string;
  search?: string;
  incident_id?: number;
}) {
  return useQuery({
    queryKey: ["material-evidence", params],
    queryFn: async () => {
      const { data } = await api.get<MaterialEvidence[]>("/evidence/material", {
        params: {
          ...(params?.item_type && params.item_type !== "all" ? { item_type: params.item_type } : {}),
          ...(params?.custody_status && params.custody_status !== "all" ? { custody_status: params.custody_status } : {}),
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.incident_id ? { incident_id: params.incident_id } : {}),
        },
      });
      return data;
    },
  });
}

export function useUpdateMaterialEvidenceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      evidenceId,
      status,
      location,
    }: {
      evidenceId: number;
      status: string;
      location?: string;
    }) => {
      const { data } = await api.patch<MaterialEvidence>(
        `/evidence/material/${evidenceId}/status`,
        { custody_status: status, custody_location: location }
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["material-evidence"] });
      qc.invalidateQueries({ queryKey: ["crimes"] });
    },
  });
}

export function useCreateMaterialEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      incident_id: number;
      item_type: string;
      item_name: string;
      identifier?: string;
      description?: string;
      custody_status?: string;
      custody_location?: string;
      seizure_memo_no?: string;
    }) => {
      const { data } = await api.post<MaterialEvidence>("/evidence/material", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["material-evidence"] });
      qc.invalidateQueries({ queryKey: ["crimes"] });
    },
  });
}

export function useFIRFile(firId: number) {
  return useQuery({
    queryKey: ["evidence-verify", firId],
    queryFn: async () => {
      const { data } = await api.get<EvidenceVerification>(`/evidence/fir/${firId}/verify`);
      return data;
    },
    enabled: firId > 0,
  });
}

export function useVerifyFIRIntegrity() {
  return useMutation({
    mutationFn: async (firId: number) => {
      const { data } = await api.get<EvidenceVerification>(`/evidence/fir/${firId}/verify`);
      return data;
    },
  });
}

export function useCustodyChain(firId: number) {
  return useQuery({
    queryKey: ["custody-chain", firId],
    queryFn: async () => {
      const { data } = await api.get<CustodyEvent[]>(`/evidence/fir/${firId}/custody`);
      return data;
    },
    enabled: firId > 0,
  });
}
