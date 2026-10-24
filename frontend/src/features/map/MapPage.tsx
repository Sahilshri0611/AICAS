import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip as LTooltip } from "react-leaflet";
import { Map as MapIcon, Layers, Flame, MapPin, Grid3x3, Building2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "@/components/common/RiskBadge";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { CITY_BOUNDS, CITY_CENTER, CITY_ZOOM } from "@/lib/geo";
import { useCrimeTypes } from "@/features/records/hooks";
import { useGeography } from "@/features/reference/hooks";
import { useMapMarkers, useHeatmap } from "./hooks";
import { ClusterLayer, HeatLayer, PlainMarkers } from "./layers";
import type { MapMarker } from "@/types";

const LEGEND = [
  ["Critical", "#ef4444"], ["High", "#f97316"], ["Medium", "#3b82f6"], ["Low", "#94a3b8"],
] as const;

export function MapPage() {
  const [crimeType, setCrimeType] = useState("all");
  const [risk, setRisk] = useState("all");
  const [showHeat, setShowHeat] = useState(false);
  const [cluster, setCluster] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [zone, setZone] = useState("all");
  const [station, setStation] = useState("all");
  const [selected, setSelected] = useState<MapMarker | null>(null);
  const geo = useGeography();

  const filters = { crime_type: crimeType, risk_level: risk, district: zone, station };
  const markers = useMapMarkers(filters);
  const heat = useHeatmap(filters, showHeat);
  const types = useCrimeTypes();
  const data = markers.data ?? [];

  return (
    <div>
      <PageHeader
        title="Incident Map"
        description="Live geographic view of crime across Nagpur City Police jurisdiction."
        icon={MapIcon}
        actions={<Badge variant="secondary">{data.length} incidents plotted</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Controls */}
        <Card glass className="space-y-4 p-4 lg:col-span-1">
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> Filters
            </p>
            <div className="space-y-2">
              <Select value={crimeType} onValueChange={setCrimeType}>
                <SelectTrigger><SelectValue placeholder="Crime type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All crime types</SelectItem>
                  {types.data?.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger><SelectValue placeholder="Risk level" /></SelectTrigger>
                <SelectContent>
                  {["all", "Critical", "High", "Medium", "Low"].map((r) => (
                    <SelectItem key={r} value={r}>{r === "all" ? "All risk levels" : r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={zone} onValueChange={(v) => { setZone(v); setStation("all"); }}>
                <SelectTrigger><SelectValue placeholder="Zone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All zones</SelectItem>
                  {geo.data?.zones.map((z) => <SelectItem key={z.id} value={String(z.id)}>{z.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={station} onValueChange={setStation}>
                <SelectTrigger><SelectValue placeholder="Police station" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value="all">All police stations</SelectItem>
                  {geo.data?.zones.filter((z) => zone === "all" || String(z.id) === zone).map((z) => (
                    <SelectGroup key={z.id}>
                      <SelectLabel>{z.name}</SelectLabel>
                      {geo.data!.stations.filter((s) => s.zone === z.id).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Layers</p>
            <div className="space-y-2">
              <Button variant={showHeat ? "default" : "outline"} size="sm" className="w-full justify-start" onClick={() => setShowHeat((s) => !s)}>
                <Flame className="h-4 w-4" /> Heatmap {showHeat ? "on" : "off"}
              </Button>
              <Button variant={cluster ? "default" : "outline"} size="sm" className="w-full justify-start" onClick={() => setCluster((c) => !c)}>
                <Grid3x3 className="h-4 w-4" /> Clustering {cluster ? "on" : "off"}
              </Button>
              <Button variant={showStations ? "default" : "outline"} size="sm" className="w-full justify-start" onClick={() => setShowStations((s) => !s)}>
                <Building2 className="h-4 w-4" /> Police stations {showStations ? "on" : "off"}
              </Button>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legend</p>
            <div className="space-y-1.5">
              {LEGEND.map(([label, color]) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {selected && (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-medium">{selected.crime_id}</span>
                <RiskBadge level={selected.risk_level} />
              </div>
              <p className="mt-2 text-sm font-semibold">{selected.primary_type}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" /> {selected.area}
              </p>
              <p className="text-xs text-muted-foreground">{fmtDate(selected.occurred_at)}</p>
            </div>
          )}
        </Card>

        {/* Map */}
        <Card glass className={cn("overflow-hidden p-0 lg:col-span-3")}>
          <div className="h-[70vh] w-full">
            <MapContainer center={CITY_CENTER} zoom={CITY_ZOOM} maxBounds={CITY_BOUNDS} minZoom={10} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {showHeat && heat.data && <HeatLayer points={heat.data} />}
              {!showHeat && (cluster
                ? <ClusterLayer markers={data} onSelect={setSelected} />
                : <PlainMarkers markers={data} onSelect={setSelected} />)}
              {showStations && geo.data?.stations.map((s) => (
                <CircleMarker
                  key={`ps-${s.id}`}
                  center={[s.latitude, s.longitude]}
                  radius={6}
                  pathOptions={{ color: "#1e3a8a", weight: 2, fillColor: "#ffffff", fillOpacity: 1 }}
                >
                  <LTooltip direction="top">
                    <span className="font-semibold">{s.name} PS</span> · {s.zone_name}
                  </LTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
