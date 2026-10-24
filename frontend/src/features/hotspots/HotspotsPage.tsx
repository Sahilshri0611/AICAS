import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip } from "react-leaflet";
import { Flame, TrendingUp, TrendingDown, Trophy } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/common/states";
import { cn } from "@/lib/utils";
import { fmtNumber } from "@/lib/format";
import { CITY_BOUNDS, CITY_CENTER, CITY_ZOOM } from "@/lib/geo";
import { useHotspots } from "./hooks";

function heatFill(score: number) {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.5) return "#f97316";
  if (score >= 0.3) return "#3b82f6";
  return "#94a3b8";
}

export function HotspotsPage() {
  const { data, isLoading, isError } = useHotspots(10);

  return (
    <div>
      <PageHeader
        title="Hotspot Intelligence"
        description="Predicted crime concentration, risk ranking and risk index by Nagpur police station."
        icon={Flame}
      />

      {isLoading && <LoadingState label="Scoring hotspots…" />}
      {isError && <ErrorState />}

      {data && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Heat map view */}
          <ChartCard title="Hotspot Heatmap" description="Area risk concentration" className="lg:col-span-3" bodyClassName="p-0">
            <div className="h-[62vh] overflow-hidden rounded-b-xl">
              <MapContainer center={CITY_CENTER} zoom={CITY_ZOOM} maxBounds={CITY_BOUNDS} minZoom={10} className="h-full w-full" scrollWheelZoom>
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {data.heat_points.map((p, i) => (
                  <CircleMarker
                    key={i}
                    center={[p.lat, p.lon]}
                    radius={8 + p.intensity * 22}
                    pathOptions={{
                      color: heatFill(p.intensity),
                      fillColor: heatFill(p.intensity),
                      fillOpacity: 0.35,
                      weight: 1,
                    }}
                  >
                    <LTooltip>Score {p.intensity.toFixed(2)}</LTooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </ChartCard>

          {/* Top 10 ranking */}
          <ChartCard
            title="Top 10 Predicted Areas"
            description="Ranked by hotspot score"
            className="lg:col-span-2"
            bodyClassName="space-y-2"
          >
            {data.top_areas.map((a) => {
              const up = (a.change_pct ?? 0) >= 0;
              return (
                <div key={a.rank} className="flex items-center gap-3 rounded-lg border bg-card/50 p-3">
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                      a.rank <= 3 ? "bg-high/15 text-high" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {a.rank <= 3 ? <Trophy className="h-4 w-4" /> : a.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.area}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtNumber(a.incident_count)} incidents · risk index {a.risk_index.toFixed(2)}
                    </p>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${a.hotspot_score * 100}%`, background: heatFill(a.hotspot_score) }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums">{a.hotspot_score.toFixed(2)}</p>
                    <p className={cn("flex items-center justify-end gap-0.5 text-xs", up ? "text-destructive" : "text-success")}>
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(a.change_pct ?? 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </ChartCard>

          {/* Area risk index + historical comparison */}
          <Card glass className="p-5 lg:col-span-5">
            <p className="mb-3 text-sm font-semibold">Area Risk Index & Historical Comparison</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.top_areas.slice(0, 5).map((a) => (
                <div key={a.rank} className="rounded-lg border p-3">
                  <p className="truncate text-sm font-medium">{a.area}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums">{a.risk_index.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Predicted next: {a.predicted_next ?? "—"}/wk</p>
                  <p className={cn("mt-1 text-xs font-medium", (a.change_pct ?? 0) >= 0 ? "text-destructive" : "text-success")}>
                    {(a.change_pct ?? 0) >= 0 ? "▲" : "▼"} {Math.abs(a.change_pct ?? 0).toFixed(1)}% vs historical
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
