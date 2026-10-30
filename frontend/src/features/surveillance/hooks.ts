import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CCTVCamera,
  ANPRDetection,
  VehicleHotlistEntry,
  SurveillanceDashboard,
  Alert,
} from "@/types";

export function useSurveillanceDashboard() {
  return useQuery({
    queryKey: ["surveillance-dashboard"],
    queryFn: async () => {
      const { data } = await api.get<SurveillanceDashboard>("/surveillance/dashboard");
      return data;
    },
    refetchInterval: 15000,
  });
}

export function useCameras(status?: string) {
  return useQuery({
    queryKey: ["cameras", status],
    queryFn: async () => {
      const { data } = await api.get<CCTVCamera[]>("/surveillance/cameras", {
        params: status ? { status } : undefined,
      });
      return data;
    },
  });
}

export function useANPRDetections(limit = 50, hotlistOnly = false) {
  return useQuery({
    queryKey: ["anpr-detections", limit, hotlistOnly],
    queryFn: async () => {
      const { data } = await api.get<ANPRDetection[]>("/surveillance/anpr/detections", {
        params: { limit, hotlist_only: hotlistOnly },
      });
      return data;
    },
    refetchInterval: 10000,
  });
}

export function useHotlist() {
  return useQuery({
    queryKey: ["hotlist"],
    queryFn: async () => {
      const { data } = await api.get<VehicleHotlistEntry[]>("/surveillance/anpr/hotlist");
      return data;
    },
  });
}

export interface AddHotlistPayload {
  plate_number: string;
  reason: string;
  suspect_id?: number | null;
  fir_reference?: string | null;
  vehicle_description?: string | null;
}

export function useAddToHotlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddHotlistPayload) => {
      const { data } = await api.post<VehicleHotlistEntry>("/surveillance/anpr/hotlist", payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hotlist"] });
      qc.invalidateQueries({ queryKey: ["surveillance-dashboard"] });
      qc.invalidateQueries({ queryKey: ["anpr-detections"] });
    },
  });
}

export function useANPRAlerts(limit = 20) {
  return useQuery({
    queryKey: ["anpr-alerts", limit],
    queryFn: async () => {
      const { data } = await api.get<Alert[]>("/surveillance/anpr/alerts", {
        params: { limit },
      });
      return data;
    },
    refetchInterval: 10000,
  });
}
