import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { RISK_HEX } from "@/lib/format";
import type { HeatPoint, MapMarker } from "@/types";

/** Renders a heat layer from weighted points. */
export function HeatLayer({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const layer = (L as any).heatLayer(
      points.map((p) => [p.lat, p.lon, p.intensity]),
      { radius: 22, blur: 18, maxZoom: 15, gradient: { 0.3: "#3b82f6", 0.6: "#f97316", 0.9: "#ef4444" } }
    );
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
}

/** Clustered circle markers colored by risk level. */
export function ClusterLayer({
  markers,
  onSelect,
}: {
  markers: MapMarker[];
  onSelect: (m: MapMarker) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const group = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 55,
      showCoverageOnHover: false,
    });
    markers.forEach((m) => {
      const marker = L.circleMarker([m.latitude, m.longitude], {
        radius: 6,
        color: RISK_HEX[m.risk_level] ?? "#94a3b8",
        fillColor: RISK_HEX[m.risk_level] ?? "#94a3b8",
        fillOpacity: 0.75,
        weight: 1.5,
      });
      marker.bindTooltip(`${m.primary_type} · ${m.crime_id}`, { direction: "top" });
      marker.on("click", () => onSelect(m));
      group.addLayer(marker);
    });
    group.addTo(map);
    return () => { map.removeLayer(group); };
  }, [map, markers, onSelect]);
  return null;
}

/** Plain (non-clustered) circle markers. */
export function PlainMarkers({
  markers,
  onSelect,
}: {
  markers: MapMarker[];
  onSelect: (m: MapMarker) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const layer = L.layerGroup();
    markers.forEach((m) => {
      const marker = L.circleMarker([m.latitude, m.longitude], {
        radius: 6,
        color: RISK_HEX[m.risk_level] ?? "#94a3b8",
        fillColor: RISK_HEX[m.risk_level] ?? "#94a3b8",
        fillOpacity: 0.7,
        weight: 1.5,
      });
      marker.bindTooltip(`${m.primary_type} · ${m.crime_id}`, { direction: "top" });
      marker.on("click", () => onSelect(m));
      layer.addLayer(marker);
    });
    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, markers, onSelect]);
  return null;
}
