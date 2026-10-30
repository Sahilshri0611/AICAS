import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip } from "react-leaflet";
import { Flame, TrendingUp, TrendingDown, Trophy, Info } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid, Legend as RLegend,
} from "recharts";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/common/states";
import { cn } from "@/lib/utils";
import { fmtNumber } from "@/lib/format";
import { CITY_BOUNDS, CITY_CENTER, CITY_ZOOM, CARTO_DARK_URL, CARTO_ATTRIBUTION, CARTO_SUBDOMAINS, HAS_CARTO_KEY } from "@/lib/geo";
import { useHotspots } from "./hooks";

function heatFill(score: number) {
  if (score >= 0.7) return "#ef4444";
  if (score >= 0.5) return "#f97316";
  if (score >= 0.3) return "#3b82f6";
  return "#94a3b8";
}

const HOTSPOT_LEGEND = [
  { label: "Critical Risk (Score ≥ 0.70)", color: "#ef4444" },
  { label: "High Risk (Score 0.50 - 0.70)", color: "#f97316" },
  { label: "Moderate Risk (Score 0.30 - 0.50)", color: "#3b82f6" },
  { label: "Low Baseline (Score < 0.30)", color: "#94a3b8" },
];

export function HotspotsPage() {
  const { data, isLoading, isError } = useHotspots(10);

  const comparisonData = (data?.top_areas ?? []).slice(0, 8).map((a) => ({
    name: a.area.replace(" Police Station", "").replace(" PS", ""),
    "Hotspot Score": Math.round(a.hotspot_score * 100),
    "Risk Index": Math.round(a.risk_index * 100),
  }));

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
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-5">
            {/* Heat map view */}
            <div className="space-y-4 lg:col-span-3">
              <ChartCard title="Hotspot Heatmap" description="Spatial risk concentration with density markers" bodyClassName="p-0">
                <div className="relative h-[440px] overflow-hidden rounded-b-xl">
                  <MapContainer center={CITY_CENTER} zoom={CITY_ZOOM} maxBounds={CITY_BOUNDS} minZoom={10} className={cn("h-full w-full", !HAS_CARTO_KEY && "dark-map-tiles")} scrollWheelZoom>
                    <TileLayer
                      url={CARTO_DARK_URL}
                      attribution={CARTO_ATTRIBUTION}
                      subdomains={CARTO_SUBDOMAINS}
                    />
                    {data.heat_points.map((p, i) => (
                      <CircleMarker
                        key={i}
                        center={[p.lat, p.lon]}
                        radius={8 + p.intensity * 22}
                        pathOptions={{
                          color: heatFill(p.intensity),
                          fillColor: heatFill(p.intensity),
                          fillOpacity: 0.38,
                          weight: 1.5,
                        }}
                      >
                        <LTooltip>Score {p.intensity.toFixed(2)}</LTooltip>
                      </CircleMarker>
                    ))}
                  </MapContainer>

                  {/* Hotspot Intensity Legend */}
                  <div className="absolute bottom-3 right-3 z-[1000] rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg backdrop-blur-md text-xs space-y-1.5">
                    <p className="font-semibold text-foreground uppercase tracking-wider text-[10px]">
                      Hotspot Intensity Scale
                    </p>
                    {HOTSPOT_LEGEND.map((item) => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-[11px] text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>

              {/* Station Comparison Chart under the map */}
              <ChartCard
                title="Top Station Risk Comparison"
                description="Hotspot score vs risk index rating per station jurisdiction"
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={comparisonData} margin={{ left: -15, right: 10, top: 8, bottom: 20 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      width={35}
                    />
                    <RTooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--card))",
                        fontSize: 12,
                      }}
                    />
                    <RLegend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: 6 }}
                      formatter={(v) => <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{v}</span>}
                    />
                    <Bar dataKey="Hotspot Score" fill="#f97316" radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="Risk Index" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

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
      </div>
      )}
    </div>
  );
}
