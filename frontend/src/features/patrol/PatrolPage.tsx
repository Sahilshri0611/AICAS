import { useState } from "react";
import L from "leaflet";
import {
  Navigation,
  Sparkles,
  Clock,
  MapPin,
  Shield,
  Sun,
  Moon,
  Sunset,
  Route as RouteIcon,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip as LTooltip,
  Popup,
} from "react-leaflet";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/states";
import { CITY_BOUNDS, CITY_CENTER, CITY_ZOOM, CARTO_DARK_URL, CARTO_ATTRIBUTION, CARTO_SUBDOMAINS, HAS_CARTO_KEY } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { apiError } from "@/lib/api";
import { usePatrolRoutes, usePatrolBriefing, useGenerateRoutes } from "./hooks";
import type { PatrolRoute, PatrolWaypoint } from "@/types";

const PRIORITY_COLORS: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#3b82f6",
  Low: "#94a3b8",
};

function priorityVariant(p: string): "destructive" | "warning" | "default" | "secondary" {
  if (p === "Critical") return "destructive";
  if (p === "High") return "warning";
  if (p === "Medium") return "default";
  return "secondary";
}

function shiftIcon(shift: string) {
  if (shift.toLowerCase() === "night") return <Moon className="h-3 w-3" />;
  if (shift.toLowerCase() === "evening") return <Sunset className="h-3 w-3" />;
  return <Sun className="h-3 w-3" />;
}

const createNumberedIcon = (num: number, color: string, isSelected: boolean) =>
  L.divIcon({
    className: "custom-patrol-waypoint-icon",
    html: `<div style="background-color:${color};color:white;border-radius:50%;width:${
      isSelected ? 26 : 22
    }px;height:${
      isSelected ? 26 : 22
    }px;display:flex;align-items:center;justify-content:center;font-size:${
      isSelected ? 12 : 10
    }px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.4);">${num}</div>`,
    iconSize: isSelected ? [26, 26] : [22, 22],
    iconAnchor: isSelected ? [13, 13] : [11, 11],
  });

export function PatrolPage() {
  const { data: routes, isLoading, isError } = usePatrolRoutes();
  const generateMutation = useGenerateRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  const selectedRoute = routes?.find((r) => r.id === selectedRouteId) || (routes && routes.length > 0 ? routes[0] : null);
  const { data: briefing } = usePatrolBriefing(selectedRoute?.id ?? 0);

  const handleGenerate = () => {
    generateMutation.mutate(
      {},
      {
        onSuccess: (data) => {
          toast.success("Routes generated", `Generated ${data.length} optimized patrol beats`);
          if (data.length > 0) {
            setSelectedRouteId(data[0].id);
          }
        },
        onError: (err) => {
          toast.error("Generation failed", apiError(err));
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Beat Patrol"
        description="AI-generated patrol routes optimizing police presence across predicted crime hotspots and high-risk zones."
        icon={Navigation}
        actions={
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Routes from Predictions
          </Button>
        }
      />

      {isLoading && <LoadingState label="Loading patrol deployments…" />}
      {isError && <ErrorState message="Could not load patrol routes." />}

      {routes && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column (2/3): Leaflet Map */}
          <div className="lg:col-span-2 space-y-4">
            <Card glass className="overflow-hidden p-0">
              <div className="relative h-[650px] w-full">
                <MapContainer
                  center={CITY_CENTER}
                  zoom={CITY_ZOOM}
                  maxBounds={CITY_BOUNDS}
                  minZoom={10}
                  className={cn("h-full w-full", !HAS_CARTO_KEY && "dark-map-tiles")}
                  scrollWheelZoom
                >
                  <TileLayer
                    url={CARTO_DARK_URL}
                    attribution={CARTO_ATTRIBUTION}
                    subdomains={CARTO_SUBDOMAINS}
                  />

                  {/* Render Routes */}
                  {routes.map((route: PatrolRoute) => {
                    const isSelected = selectedRoute?.id === route.id;
                    const color = PRIORITY_COLORS[route.priority] || "#3b82f6";
                    const sortedWaypoints = [...(route.waypoints || [])].sort((a, b) => a.order - b.order);
                    const polyPositions: [number, number][] = sortedWaypoints
                      .filter((w) => w.latitude != null && w.longitude != null)
                      .map((w) => [w.latitude, w.longitude]);

                    return (
                      <div key={route.id}>
                        {polyPositions.length > 1 && (
                          <Polyline
                            positions={polyPositions}
                            pathOptions={{
                              color,
                              weight: isSelected ? 5 : 2.5,
                              opacity: isSelected ? 0.95 : 0.45,
                              dashArray: isSelected ? undefined : "6, 6",
                            }}
                          />
                        )}

                        {/* Render Waypoint Markers ONLY for the selected route to avoid visual clutter */}
                        {isSelected && sortedWaypoints.map((wp: PatrolWaypoint, idx: number) => {
                          if (wp.latitude == null || wp.longitude == null) return null;
                          return (
                            <Marker
                              key={`${route.id}-${wp.order}-${idx}`}
                              position={[wp.latitude, wp.longitude]}
                              icon={createNumberedIcon(wp.order, color, true)}
                            >
                              <LTooltip direction="top" offset={[0, -10]}>
                                <div className="text-xs">
                                  <p className="font-bold">
                                    Stop #{wp.order}: {wp.name}
                                  </p>
                                  <p className="text-muted-foreground">Route: {route.name}</p>
                                  <p className="text-destructive font-semibold">
                                    Risk Score: {wp.risk_score.toFixed(2)}
                                  </p>
                                </div>
                              </LTooltip>
                              <Popup>
                                <div className="text-xs space-y-1">
                                  <p className="font-bold text-sm">
                                    #{wp.order} {wp.name}
                                  </p>
                                  <p><b>Route:</b> {route.name}</p>
                                  <p><b>Risk Score:</b> {wp.risk_score.toFixed(2)}</p>
                                  <p><b>Priority:</b> {route.priority}</p>
                                  <p><b>Shift:</b> {route.shift}</p>
                                </div>
                              </Popup>
                            </Marker>
                          );
                        })}
                      </div>
                    );
                  })}
                </MapContainer>

                {/* Legend overlay */}
                <div className="absolute bottom-4 left-4 z-[1000] rounded-xl bg-card/90 p-3 shadow-md backdrop-blur border text-xs space-y-1.5">
                  <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Route Priority
                  </p>
                  {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
                    <div key={p} className="flex items-center gap-2">
                      <span className="h-2.5 w-6 rounded-full" style={{ backgroundColor: c }} />
                      <span className="font-medium">{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Optional Patrol Briefing if route is selected */}
            {briefing && (
              <Card glass className="p-4">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      Tactical Briefing: {briefing.route.name}
                    </span>
                    <Badge variant="outline">
                      Suggested Units: {briefing.suggested_strength}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-3 bg-card/40 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      High Risk Focus Areas
                    </p>
                    {briefing.high_risk_areas?.length > 0 ? (
                      briefing.high_risk_areas.map((h, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate">{h.area}</span>
                          <span className="font-mono text-destructive">
                            Score {h.risk_score.toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">Standard surveillance</p>
                    )}
                  </div>

                  <div className="rounded-lg border p-3 bg-card/40 space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Recent Activity
                    </p>
                    {briefing.recent_incidents?.length > 0 ? (
                      briefing.recent_incidents.slice(0, 3).map((inc, i) => (
                        <div key={i} className="text-xs truncate">
                          <span className="font-semibold">{inc.type}:</span> {inc.location} ({inc.date})
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">No recent incidents in zone</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (1/3): Route List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Active Patrol Routes</h2>
              <Badge variant="secondary" className="font-mono">
                {routes.length} beats
              </Badge>
            </div>

            {routes.length === 0 ? (
              <EmptyState
                title="No Patrol Routes"
                description="Click 'Generate Routes from Predictions' to create optimized beats."
              />
            ) : (
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1 pb-10">
                {routes.map((route: PatrolRoute) => {
                  const isSelected = selectedRoute?.id === route.id;
                  const priorityColor = PRIORITY_COLORS[route.priority] || "#3b82f6";

                  return (
                    <Card
                      key={route.id}
                      glass
                      onClick={() => setSelectedRouteId(route.id)}
                      className={cn(
                        "cursor-pointer p-4 transition-all duration-200 border-l-4 hover:shadow-md",
                        isSelected
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "hover:bg-accent/40"
                      )}
                      style={{ borderLeftColor: priorityColor }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{route.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {route.station_id ? `Station #${route.station_id}` : "Headquarters"}
                            {route.zone ? ` · Zone ${route.zone}` : ""}
                          </p>
                        </div>
                        <Badge variant={priorityVariant(route.priority)} className="ml-2 shrink-0">
                          {route.priority}
                        </Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          {shiftIcon(route.shift)}
                          <span className="capitalize">{route.shift} Shift</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RouteIcon className="h-3 w-3" />
                          <span>{route.waypoints?.length ?? 0} waypoints</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>{route.estimated_duration_min ?? 45} mins</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3 w-3" />
                          <span className="capitalize">{route.status || "Active"}</span>
                        </div>
                      </div>

                      {route.total_distance_km && (
                        <p className="mt-2 text-[11px] text-muted-foreground pt-2 border-t">
                          Total Distance: {route.total_distance_km.toFixed(1)} km
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
