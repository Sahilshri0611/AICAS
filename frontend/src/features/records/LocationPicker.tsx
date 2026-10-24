import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip as LTooltip, useMap, useMapEvents } from "react-leaflet";
import { CITY_BOUNDS, CITY_CENTER } from "@/lib/geo";
import type { PoliceStation } from "@/types";

export type LatLng = { lat: number; lon: number };

function ClickToPin({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6) }) });
  return null;
}

/** Re-frames the map when the focus point changes; fixes sizing inside dialogs. */
function Recenter({ focus, zoom }: { focus: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(t);
  }, [map]);
  useEffect(() => {
    map.setView(focus, zoom, { animate: true });
  }, [map, focus[0], focus[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Click-to-drop-pin map for case entry. Shows every police station as a faint
 * dot (selected one highlighted) so the officer can orient themselves.
 */
export function LocationPicker({
  value,
  onChange,
  stations,
  selectedStationId,
  focus,
}: {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  stations: PoliceStation[];
  selectedStationId?: number | null;
  focus?: [number, number] | null;
}) {
  // Only re-frame when the station/locality focus changes — not on every click.
  const frame = focus ?? CITY_CENTER;
  const zoom = focus ? 14 : 12;

  return (
    <div className="h-64 overflow-hidden rounded-lg border">
      <MapContainer center={frame} zoom={zoom} maxBounds={CITY_BOUNDS} className="h-full w-full cursor-crosshair" scrollWheelZoom>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Recenter focus={frame} zoom={zoom} />
        <ClickToPin onPick={onChange} />
        {stations.map((s) => {
          const active = s.id === selectedStationId;
          return (
            <CircleMarker
              key={s.id}
              center={[s.latitude, s.longitude]}
              radius={active ? 7 : 4}
              pathOptions={{
                color: active ? "#2563eb" : "#64748b",
                fillColor: active ? "#3b82f6" : "#94a3b8",
                fillOpacity: active ? 0.5 : 0.35,
                weight: 1,
              }}
            >
              <LTooltip>{s.name} PS</LTooltip>
            </CircleMarker>
          );
        })}
        {value && (
          <CircleMarker
            center={[value.lat, value.lon]}
            radius={9}
            pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.85, weight: 3 }}
          >
            <LTooltip permanent direction="top">Place of occurrence</LTooltip>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}
