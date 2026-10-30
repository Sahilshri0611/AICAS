import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MOSearchResultItem {
  incident_id: number;
  crime_id: string;
  case_number?: string | null;
  primary_type: string;
  description?: string | null;
  police_station?: string | null;
  zone_name?: string | null;
  occurred_at?: string | null;
  summary: string;
  similarity_score: number;
  similarity_percent: number;
  suspects: Array<{
    name: string;
    alias?: string | null;
    vehicle?: string | null;
    description?: string | null;
  }>;
  material_evidences: Array<{
    item_type: string;
    item_name: string;
    identifier?: string | null;
    description?: string | null;
    custody_status: string;
  }>;
}

export interface MOSearchResponse {
  query: string;
  total: number;
  results: MOSearchResultItem[];
}

export interface CopilotAskResponse {
  question: string;
  answer: string;
  cited_cases: MOSearchResultItem[];
  total_matches: number;
  suggested_follow_ups: string[];
}

export interface VectorIndexStatus {
  total_indexed: number;
  dimension: number;
  embedding_model: string;
  chat_model: string;
  is_ready: boolean;
}

export function useCopilotStatus() {
  return useQuery<VectorIndexStatus>({
    queryKey: ["copilot-status"],
    queryFn: async () => {
      const res = await api.get<VectorIndexStatus>("/copilot/status");
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useMOSearch() {
  return useMutation<
    MOSearchResponse,
    Error,
    { query: string; top_k?: number; station_id?: number | null; crime_type?: string | null }
  >({
    mutationFn: async (payload) => {
      const res = await api.post<MOSearchResponse>("/copilot/search", payload);
      return res.data;
    },
  });
}

export function useCopilotAsk() {
  return useMutation<
    CopilotAskResponse,
    Error,
    { question: string; history?: Array<{ role: string; content: string }>; top_k?: number }
  >({
    mutationFn: async (payload) => {
      const res = await api.post<CopilotAskResponse>("/copilot/ask", payload);
      return res.data;
    },
  });
}

export function useTriggerIndex() {
  const qc = useQueryClient();
  return useMutation<any, Error, { limit?: number; skip_already_indexed?: boolean }>({
    mutationFn: async (payload) => {
      const res = await api.post("/copilot/index", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["copilot-status"] });
    },
  });
}
