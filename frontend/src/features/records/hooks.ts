import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CaseFile, ImportResult, Incident, IncidentCreatePayload, IncidentDetail, Page,
} from "@/types";

export interface RecordFilters {
  search?: string;
  crime_type?: string;
  risk_level?: string;
  status?: string;
  district?: string;
  station?: string;
  page: number;
  page_size: number;
  order_by?: string;
}

function clean(params: Record<string, any>) {
  Object.keys(params).forEach((k) => (params[k] === "" || params[k] === "all" || params[k] === undefined) && delete params[k]);
  return params;
}

export function useCrimes(filters: RecordFilters) {
  return useQuery({
    queryKey: ["crimes", filters],
    queryFn: async () => {
      const { data } = await api.get<Page<Incident>>("/crimes", { params: clean({ ...filters }) });
      return data;
    },
    placeholderData: (prev) => prev,
  });
}

export function useCrimeTypes() {
  return useQuery({
    queryKey: ["crime-types"],
    queryFn: async () => {
      const { data } = await api.get<string[]>("/crimes/types");
      return data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCrimeDetail(id: number | null) {
  return useQuery({
    queryKey: ["crime-detail", id],
    enabled: id !== null,
    queryFn: async () => {
      const { data } = await api.get<IncidentDetail>(`/incidents/${id}`);
      return data;
    },
  });
}

/** Everything derived from the incident table — refresh after any write. */
const INCIDENT_KEYS = ["crimes", "crime-types", "crime-detail", "map-markers", "heatmap", "dashboard", "hotspots", "predictive", "network"];

function useInvalidateIncidents() {
  const qc = useQueryClient();
  return () => INCIDENT_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useCreateCase() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: async (payload: IncidentCreatePayload) => (await api.post<IncidentDetail>("/crimes", payload)).data,
    onSuccess: invalidate,
  });
}

export function useImportCases() {
  const invalidate = useInvalidateIncidents();
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return (await api.post<ImportResult>("/crimes/import", fd)).data;
    },
    onSuccess: (r) => { if (r.created) invalidate(); },
  });
}

// ── Case files ──
export function useFileCategories() {
  return useQuery({
    queryKey: ["file-categories"],
    queryFn: async () => (await api.get<string[]>("/incidents/files/categories")).data,
    staleTime: Infinity,
  });
}

export function useUploadCaseFiles(incidentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { files: File[]; category: string; description?: string; incidentId?: number }) => {
      const fd = new FormData();
      v.files.forEach((f) => fd.append("files", f));
      fd.append("category", v.category);
      if (v.description) fd.append("description", v.description);
      const id = v.incidentId ?? incidentId;
      return (await api.post<CaseFile[]>(`/incidents/${id}/files`, fd)).data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crime-detail"] }),
  });
}

export function useDeleteCaseFile(incidentId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: number) => api.delete(`/incidents/${incidentId}/files/${fileId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crime-detail"] }),
  });
}

// ── Downloads (need the bearer token, so fetch as blob) ──
async function downloadBlob(path: string, params: Record<string, any>, fallbackName: string, open = false) {
  const res = await api.get<Blob>(path, { params, responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  if (open) {
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = fallbackName;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCaseFile(f: CaseFile, open = false) {
  return downloadBlob(`/incidents/${f.incident_id}/files/${f.id}/download`, { inline: open }, f.original_filename, open);
}

export function downloadImportTemplate() {
  return downloadBlob("/crimes/import/template", {}, "nagpur_case_import_template.csv");
}

export async function exportRecords(fmt: "csv" | "excel", filters: Partial<RecordFilters>) {
  const params: Record<string, any> = { fmt, ...filters };
  ["page", "page_size", "order_by"].forEach((k) => delete params[k]);
  await downloadBlob("/crimes/export", clean(params), fmt === "excel" ? "crime_records.xlsx" : "crime_records.csv");
}
