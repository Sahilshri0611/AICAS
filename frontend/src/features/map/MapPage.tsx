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
import { fmtDate, fmtNumber } from "@/lib/format";
import { CITY_BOUNDS, CITY_CENTER, CITY_ZOOM, CARTO_DARK_URL, CARTO_ATTRIBUTION, CARTO_SUBDOMAINS, HAS_CARTO_KEY } from "@/lib/geo";
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

  const criticalCount = data.filter((d) => d.risk_level === "Critical").length;
  const highCount = data.filter((d) => d.risk_level === "High").length;
  const mediumCount = data.filter((d) => d.risk_level === "Medium").length;
  const lowCount = data.filter((d) => d.risk_level === "Low").length;

  return (
    <div>
      <PageHeader
        title="Incident Map"
        description="Live geographic view of crime across Nagpur City Police jurisdiction."
        icon={MapIcon}
        actions={
          <div className="flex items-center gap-2">
            <span
              className="inline-flex cursor-help items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold tabular-nums text-foreground shadow-sm"
              title="Hardware-accelerated viewport rendering: displays the most recent 2,500 active incidents out of 8,000 for smooth 60fps pan/zoom. Use filters to inspect specific jurisdictions or crime heads."
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {fmtNumber(data.length)} incidents plotted
              <span className="text-[10px] text-muted-foreground font-normal">(viewport cap: 2.5K of 8K)</span>
            </span>
          </div>
        }
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

          {/* Viewport Breakdown Widget */}
          <div className="rounded-lg border bg-card/50 p-3 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Viewport Incident Breakdown
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded border border-destructive/20 bg-destructive/10 p-2 text-center">
                <span className="text-[10px] text-destructive uppercase font-semibold">Critical</span>
                <p className="text-base font-bold text-destructive">{fmtNumber(criticalCount)}</p>
              </div>
              <div className="rounded border border-high/20 bg-high/5 p-2 text-center">
                <span className="text-[10px] text-high uppercase font-semibold">High</span>
                <p className="text-base font-bold text-high">{fmtNumber(highCount)}</p>
              </div>
              <div className="rounded border border-medium/20 bg-medium/5 p-2 text-center">
                <span className="text-[10px] text-medium uppercase font-semibold">Medium</span>
                <p className="text-base font-bold text-medium">{fmtNumber(mediumCount)}</p>
              </div>
              <div className="rounded border border-low/20 bg-low/5 p-2 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Low</span>
                <p className="text-base font-bold text-muted-foreground">{fmtNumber(lowCount)}</p>
              </div>
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
            <MapContainer center={CITY_CENTER} zoom={CITY_ZOOM} maxBounds={CITY_BOUNDS} minZoom={10} className={cn("h-full w-full", !HAS_CARTO_KEY && "dark-map-tiles")} scrollWheelZoom>
              <TileLayer
                url={CARTO_DARK_URL}
                attribution={CARTO_ATTRIBUTION}
                subdomains={CARTO_SUBDOMAINS}
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
