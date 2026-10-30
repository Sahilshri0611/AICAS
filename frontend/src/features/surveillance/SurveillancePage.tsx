import { useState } from "react";
import {
  Camera,
  Video,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Plus,
  Car,
  MapPin,
  CheckCircle2,
  HardDrive,
  Activity,
} from "lucide-react";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LTooltip, Popup } from "react-leaflet";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState, ErrorState, EmptyState } from "@/components/common/states";
import { CITY_BOUNDS, CITY_CENTER, CITY_ZOOM } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { fmtDate, fmtNumber } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { apiError } from "@/lib/api";
import {
  useSurveillanceDashboard,
  useCameras,
  useANPRDetections,
  useHotlist,
  useAddToHotlist,
} from "./hooks";
import type { CCTVCamera, ANPRDetection } from "@/types";

const REASONS = [
  "Stolen Vehicle",
  "Suspect Associated",
  "Wanted in FIR",
  "Traffic Violation",
  "Banned Entry",
  "Other",
];

function statusVariant(status: string): "success" | "destructive" | "warning" | "default" {
  if (status === "online") return "success";
  if (status === "offline") return "destructive";
  return "warning";
}

function cameraMarkerColor(status: string): string {
  if (status === "online") return "#10b981";
  if (status === "offline") return "#ef4444";
  return "#f59e0b";
}

export function SurveillancePage() {
  const { data: dashboard, isLoading: dashLoading, isError: dashError } = useSurveillanceDashboard();
  const { data: camerasList } = useCameras();
  const { data: detectionsList } = useANPRDetections(50);
  const { data: hotlist, isLoading: hotlistLoading } = useHotlist();
  const addHotlist = useAddToHotlist();

  // Hotlist Form State
  const [plateNumber, setPlateNumber] = useState("");
  const [reason, setReason] = useState("Wanted in FIR");
  const [vehicleDesc, setVehicleDesc] = useState("");

  const cameras = camerasList || dashboard?.cameras || [];
  const detections = detectionsList || dashboard?.recent_detections || [];

  const totalCameras = dashboard?.total_cameras ?? cameras.length;
  const onlineCameras = dashboard?.online_cameras ?? cameras.filter((c) => c.status === "online").length;
  const anprCameras = dashboard?.anpr_cameras ?? cameras.filter((c) => c.camera_type === "ANPR").length;
  const hotlistHits = dashboard?.hotlist_hits_today ?? detections.filter((d) => d.is_hotlist_hit).length;

  const handleAddHotlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      toast.error("Validation error", "License plate number is required");
      return;
    }

    addHotlist.mutate(
      {
        plate_number: plateNumber.trim().toUpperCase(),
        reason,
        vehicle_description: vehicleDesc.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Vehicle Added", `${plateNumber.toUpperCase()} added to hotlist`);
          setPlateNumber("");
          setVehicleDesc("");
        },
        onError: (err) => {
          toast.error("Failed to add", apiError(err));
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CCTV & ANPR Surveillance"
        description="Real-time optical monitoring, automated license plate recognition, and hotlist vehicle tracking."
        icon={Camera}
      />

      {dashLoading && <LoadingState label="Loading surveillance telemetry…" />}
      {dashError && <ErrorState message="Could not load surveillance data. Please check connection." />}

      {/* KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card glass className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Cameras
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                {fmtNumber(totalCameras)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Deployed across Nagpur</p>
        </Card>

        <Card glass className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Online Cameras
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                {fmtNumber(onlineCameras)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Active & transmitting
          </div>
        </Card>

        <Card glass className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                ANPR Cameras
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                {fmtNumber(anprCameras)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
              <Radio className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Automated plate recognition</p>
        </Card>

        <Card glass className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Hotlist Hits Today
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-destructive">
                {fmtNumber(hotlistHits)}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Flagged vehicle detections</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="grid" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          <TabsTrigger value="grid">Camera Grid</TabsTrigger>
          <TabsTrigger value="anpr">ANPR Feed</TabsTrigger>
          <TabsTrigger value="map">Camera Map</TabsTrigger>
        </TabsList>

        {/* TAB 1: Camera Grid */}
        <TabsContent value="grid" className="space-y-4">
          {cameras.length === 0 ? (
            <EmptyState
              title="No Cameras Found"
              description="No CCTV camera units are currently registered in the surveillance network."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cameras.slice(0, 9).map((camera: CCTVCamera) => (
                <Card key={camera.id} glass className="overflow-hidden">
                  <div className="relative aspect-video w-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden border-b border-border/50">
                    {/* Blinking Live Feed Dot */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                      <span className="relative flex h-2 w-2">
                        {camera.status === "online" && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        )}
                        <span
                          className={cn(
                            "relative inline-flex h-2 w-2 rounded-full",
                            camera.status === "online" ? "bg-red-500" : "bg-neutral-500"
                          )}
                        />
                      </span>
                      {camera.status === "online" ? "LIVE FEED" : "FEED OFFLINE"}
                    </div>

                    <div className="absolute top-2.5 right-2.5 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-neutral-300 backdrop-blur-sm">
                      {camera.resolution}
                    </div>

                    {/* Camera Feed Simulation Backdrop */}
                    <div className="text-center p-4">
                      <Video className="mx-auto h-8 w-8 text-neutral-600 mb-1" />
                      <p className="font-mono text-xs text-neutral-400 tracking-wider">
                        {camera.camera_id}
                      </p>
                      <p className="text-xs font-semibold text-neutral-200 mt-1 max-w-[200px] truncate">
                        {camera.name}
                      </p>
                    </div>

                    {/* Overlay scanline effect */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.02] to-black/30" />
                  </div>

                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{camera.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {camera.location}
                        </p>
                      </div>
                      <Badge variant={statusVariant(camera.status)} className="capitalize shrink-0">
                        {camera.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
                      <span>Type: <Badge variant="outline" className="text-[10px] py-0 px-1.5 ml-1">{camera.camera_type}</Badge></span>
                      <span>ID: <code className="font-mono">{camera.camera_id}</code></span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: ANPR Feed */}
        <TabsContent value="anpr" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column (2/3): Recent ANPR Detections */}
            <Card glass className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    Automated Plate Recognition Feed
                  </CardTitle>
                  <CardDescription>
                    Real-time captures and suspect vehicle matching
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {detections.length} Detections
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {detections.length === 0 ? (
                  <EmptyState
                    title="No ANPR Detections"
                    description="No vehicles have been captured by ANPR units yet."
                  />
                ) : (
                  detections.map((detection: ANPRDetection) => (
                    <div
                      key={detection.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg border p-3 transition-colors",
                        detection.is_hotlist_hit
                          ? "border-destructive/50 bg-destructive/5"
                          : "bg-card/50 hover:bg-card"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                            detection.is_hotlist_hit
                              ? "bg-destructive/15 text-destructive"
                              : "bg-primary/10 text-primary"
                          )}
                        >
                          {detection.is_hotlist_hit ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <Car className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "font-mono font-bold text-sm tracking-wide px-2 py-0.5 rounded border",
                                detection.is_hotlist_hit
                                  ? "border-destructive bg-destructive/10 text-destructive"
                                  : "bg-muted font-mono"
                              )}
                            >
                              {detection.plate_number}
                            </span>
                            {detection.is_hotlist_hit && (
                              <Badge variant="destructive" className="animate-pulse">
                                HOTLIST HIT
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {detection.vehicle_make || "Unknown Make"}
                            {detection.vehicle_color ? ` · ${detection.vehicle_color}` : ""}
                            {" · Camera #" + detection.camera_id}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold tabular-nums">
                          {Math.round(detection.confidence * 100)}% conf
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {fmtDate(detection.detected_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Right Column (1/3): Hotlist Management */}
            <div className="space-y-4">
              <Card glass>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add to Hotlist
                  </CardTitle>
                  <CardDescription>
                    Blacklist a license plate for automatic interception
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddHotlist} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        License Plate Number
                      </label>
                      <Input
                        value={plateNumber}
                        onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                        placeholder="e.g. MH31AB1234"
                        className="font-mono uppercase mt-1"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Reason</label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Vehicle Description (Optional)
                      </label>
                      <Input
                        value={vehicleDesc}
                        onChange={(e) => setVehicleDesc(e.target.value)}
                        placeholder="e.g. White Swift Dzire, tinted glass"
                        className="mt-1"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={addHotlist.isPending || !plateNumber.trim()}
                    >
                      {addHotlist.isPending ? "Adding…" : "Add to Hotlist"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Active Hotlist Entries */}
              <Card glass>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Active Blacklist</span>
                    <Badge variant="secondary" className="font-mono">
                      {hotlist?.length ?? 0}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {hotlistLoading && <p className="text-xs text-muted-foreground">Loading blacklist…</p>}
                  {(!hotlist || hotlist.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No vehicles on hotlist.
                    </p>
                  )}
                  {hotlist?.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-lg border p-2.5 text-xs bg-card/40 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-destructive">
                          {entry.plate_number}
                        </span>
                        <Badge
                          variant={entry.status === "active" ? "destructive" : "secondary"}
                          className="text-[10px] px-1.5 py-0 capitalize"
                        >
                          {entry.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{entry.reason}</p>
                      {entry.vehicle_description && (
                        <p className="text-[11px] text-muted-foreground italic">
                          {entry.vehicle_description}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Camera Map */}
        <TabsContent value="map" className="space-y-4">
          <Card glass className="overflow-hidden p-0">
            <div className="h-[650px] w-full">
              <MapContainer
                center={CITY_CENTER}
                zoom={CITY_ZOOM}
                maxBounds={CITY_BOUNDS}
                minZoom={10}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {cameras
                  .filter((c) => c.latitude != null && c.longitude != null)
                  .map((camera) => (
                    <CircleMarker
                      key={camera.id}
                      center={[camera.latitude!, camera.longitude!]}
                      radius={8}
                      pathOptions={{
                        color: cameraMarkerColor(camera.status),
                        fillColor: cameraMarkerColor(camera.status),
                        fillOpacity: 0.85,
                        weight: 2,
                      }}
                    >
                      <LTooltip direction="top" offset={[0, -6]}>
                        <div className="text-xs">
                          <p className="font-bold">{camera.name}</p>
                          <p className="text-muted-foreground">{camera.location}</p>
                          <p className="capitalize font-semibold mt-0.5">
                            Status: {camera.status} · {camera.camera_type}
                          </p>
                        </div>
                      </LTooltip>
                      <Popup>
                        <div className="p-1 space-y-1 text-xs">
                          <p className="font-bold text-sm">{camera.name}</p>
                          <p className="text-muted-foreground">{camera.location}</p>
                          <p><b>ID:</b> {camera.camera_id}</p>
                          <p><b>Type:</b> {camera.camera_type}</p>
                          <p><b>Resolution:</b> {camera.resolution}</p>
                          <p><b>Status:</b> <span className="capitalize font-semibold">{camera.status}</span></p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
              </MapContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
