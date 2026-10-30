import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import {
  Share2,
  Users,
  MapPin,
  FileText,
  GitBranch,
  Layers,
  Target,
  Car,
  Search,
  X,
  ShieldAlert,
  Plus,
  Minus,
  Maximize2,
  RotateCcw,
  Filter,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNetwork } from "./hooks";
import type { GraphNode } from "@/types";

const NODE_COLOR: Record<string, string> = {
  Suspect: "#ef4444",
  Incident: "#3b82f6",
  Location: "#10b981",
  Vehicle: "#eab308",
};

const NODE_ICON: Record<string, any> = {
  Suspect: Users,
  Incident: FileText,
  Location: MapPin,
  Vehicle: Car,
};

const NODE_SHAPES: Record<string, string> = {
  Suspect: "Square",
  Incident: "Circle",
  Location: "Diamond",
  Vehicle: "Triangle",
};

export function NetworkPage() {
  const { data, isLoading, isError } = useNetwork(250);
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 850, height: 700 });
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleTypes, setVisibleTypes] = useState<Record<string, boolean>>({
    Suspect: true,
    Incident: true,
    Location: true,
    Vehicle: true,
  });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setDimensions({ width: Math.floor(rect.width), height: 700 });
        }
      }
    };
    updateSize();
    const obs = new ResizeObserver(updateSize);
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const toggleType = (t: string) => {
    setVisibleTypes((prev) => ({ ...prev, [t]: !prev[t] }));
  };

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const allowed = new Set(data.nodes.filter((n) => visibleTypes[n.type] ?? true).map((n) => n.id));
    return {
      nodes: data.nodes.filter((n) => allowed.has(n.id)).map((n) => ({ ...n })),
      links: data.edges
        .filter((e) => {
          const sId = typeof e.source === "object" ? (e.source as any).id : e.source;
          const tId = typeof e.target === "object" ? (e.target as any).id : e.target;
          return allowed.has(sId) && allowed.has(tId);
        })
        .map((e) => ({ ...e })),
    };
  }, [data, visibleTypes]);

  const searchFilteredNodes = useMemo(() => {
    if (!searchQuery.trim() || !data) return [];
    const q = searchQuery.toLowerCase();
    return data.nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        (n.meta?.alias && String(n.meta.alias).toLowerCase().includes(q))
    );
  }, [searchQuery, data]);

  const handleSelectNode = (node: GraphNode) => {
    setSelected(node);
    if (fgRef.current && (node as any).x != null && (node as any).y != null) {
      fgRef.current.centerAt((node as any).x, (node as any).y, 800);
      fgRef.current.zoom(3, 800);
    }
  };

  const paint = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, scale: number) => {
      // Enhanced paint function: node size scales more with centrality and degree
      const centralityScale = (node.centrality || 0) * 18;
      const degreeScale = (node.degree || 1) * 0.6;
      const size = Math.max(4.5, 3 + degreeScale + centralityScale);
      const color = NODE_COLOR[node.type] ?? "#94a3b8";

      const isMatchingSearch =
        searchQuery && node.label?.toLowerCase().includes(searchQuery.toLowerCase());
      const isCurrentSelected = selected?.id === node.id;

      ctx.fillStyle = color;
      ctx.strokeStyle = isCurrentSelected || isMatchingSearch ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = isCurrentSelected ? 3 : isMatchingSearch ? 2 : 1;

      ctx.beginPath();
      if (node.type === "Suspect") {
        // Square for Suspects
        ctx.rect(node.x - size, node.y - size, size * 2, size * 2);
      } else if (node.type === "Location") {
        // Diamond for Locations
        ctx.moveTo(node.x, node.y - size * 1.3);
        ctx.lineTo(node.x + size * 1.3, node.y);
        ctx.lineTo(node.x, node.y + size * 1.3);
        ctx.lineTo(node.x - size * 1.3, node.y);
        ctx.closePath();
      } else if (node.type === "Vehicle") {
        // Triangle for Vehicles
        ctx.moveTo(node.x, node.y - size * 1.3);
        ctx.lineTo(node.x + size * 1.2, node.y + size);
        ctx.lineTo(node.x - size * 1.2, node.y + size);
        ctx.closePath();
      } else {
        // Circle for Incidents
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      }
      ctx.fill();
      ctx.stroke();

      // Label rendering
      if (scale > 2.2 || isMatchingSearch || isCurrentSelected) {
        ctx.font = `${Math.max(10 / scale, 3.5)}px Inter, sans-serif`;
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(String(node.label).slice(0, 20), node.x + size + 2, node.y + 2);
      }
    },
    [selected, searchQuery]
  );

  const stats = data?.stats;

  return (
    <div>
      <PageHeader
        title="Suspect & Network Analysis"
        description="Graph intelligence — connections across suspects, incidents, locations & associated vehicles."
        icon={Share2}
      />

      {isLoading && <LoadingState label="Building network graph…" />}
      {isError && <ErrorState />}

      {data && (
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Stats & Search Panel */}
          <div className="space-y-3 lg:col-span-1">
            {/* Search Input */}
            <Card glass className="p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entities & suspects…"
                  className="pl-8 text-xs h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchFilteredNodes.length > 0 && (
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto border-t pt-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Matches ({searchFilteredNodes.length})
                  </p>
                  {searchFilteredNodes.slice(0, 5).map((node) => (
                    <div
                      key={node.id}
                      onClick={() => handleSelectNode(node)}
                      className="cursor-pointer rounded p-1.5 text-xs hover:bg-accent/60 flex items-center justify-between"
                    >
                      <span className="truncate font-medium">{node.label}</span>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {node.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {stats && (
              <Card glass className="grid grid-cols-2 gap-3 p-4">
                {[
                  { label: "Nodes", value: stats.node_count, icon: Target },
                  { label: "Edges", value: stats.edge_count, icon: GitBranch },
                  { label: "Components", value: stats.component_count, icon: Layers },
                  { label: "Isolated", value: stats.isolated_nodes, icon: Target },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border p-2.5">
                    <s.icon className="mb-1 h-4 w-4 text-primary" />
                    <p className="text-xl font-bold tabular-nums">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
                <div className="col-span-2 rounded-lg border p-2.5">
                  <p className="text-xs text-muted-foreground">Largest component</p>
                  <p className="text-lg font-bold">{stats.largest_component_size} nodes</p>
                </div>
              </Card>
            )}

            {/* Interactive Entity Filters */}
            <Card glass className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Entity Type Filters
                </p>
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="space-y-1.5 pt-1">
                {Object.entries(NODE_COLOR).map(([type, color]) => {
                  const Icon = NODE_ICON[type] ?? Target;
                  const active = visibleTypes[type] ?? true;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleType(type)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        active ? "bg-accent/60 font-medium" : "opacity-40 hover:opacity-75"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                        <Icon className="h-3.5 w-3.5" />
                        <span>{type}s</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase">{active ? "Visible" : "Hidden"}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <ChartCard
              title="High-Influence Suspects & Kingpins"
              description="Key persons of interest ranked by network centrality"
              bodyClassName="space-y-1.5"
            >
              {stats?.top_central_nodes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleSelectNode(n)}
                  className="flex items-center gap-2 rounded-md p-1.5 text-sm cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: NODE_COLOR[n.type] ?? "#ef4444" }} />
                  <span className="flex-1 truncate font-medium text-xs">{n.label}</span>
                  <Badge variant="secondary" className="font-mono text-[10px] py-0">
                    deg {n.degree}
                  </Badge>
                </div>
              ))}
            </ChartCard>
          </div>

          {/* Graph Container */}
          <Card glass className="relative overflow-hidden p-0 lg:col-span-3">
            <div ref={containerRef} className="h-[700px] w-full relative">
              <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeCanvasObject={paint}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  const size = Math.max(6, 4 + (node.degree || 1) * 0.6 + (node.centrality || 0) * 18);
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
                  ctx.fill();
                }}
                nodeLabel={(n: any) =>
                  `${n.label} [${n.type}]${n.meta?.alias ? ` • Alias: ${n.meta.alias}` : ""}${n.degree ? ` • Degree: ${n.degree}` : ""}`
                }
                linkColor={() => "rgba(100,116,139,0.3)"}
                linkWidth={(l: any) => l.weight * 0.8}
                onNodeClick={(n: any) => handleSelectNode(n)}
                cooldownTicks={120}
                backgroundColor="transparent"
              />

              {/* Floating Graph Controls */}
              <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 rounded-xl border bg-card/85 p-1.5 shadow-lg backdrop-blur">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-accent"
                  title="Zoom In"
                  onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.35, 400)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-accent"
                  title="Zoom Out"
                  onClick={() => fgRef.current?.zoom(fgRef.current.zoom() / 1.35, 400)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-accent"
                  title="Fit to Screen"
                  onClick={() => fgRef.current?.zoomToFit(400, 35)}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-accent"
                  title="Reset Center"
                  onClick={() => {
                    fgRef.current?.centerAt(0, 0, 400);
                    fgRef.current?.zoom(1.2, 400);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Selected Node Detail Panel: Slide-over card */}
            {selected && (
              <div className="absolute top-4 right-4 w-80 rounded-xl border bg-card/95 p-5 shadow-2xl backdrop-blur-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: NODE_COLOR[selected.type] }}
                    />
                    <Badge variant="outline" className="font-semibold text-xs">
                      {selected.type}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(null)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <p className="mt-2 text-base font-bold text-foreground">{selected.label}</p>

                {/* Suspect Specific Information from node.meta */}
                {selected.type === "Suspect" && (
                  <div className="mt-3 space-y-2 border-t pt-3 text-xs">
                    {selected.meta?.alias && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Alias / Moniker:</span>
                        <span className="font-semibold">{selected.meta.alias}</span>
                      </div>
                    )}
                    {selected.meta?.vehicle && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Associated Vehicle:</span>
                        <span className="font-mono font-semibold">{selected.meta.vehicle}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connected Incidents:</span>
                      <span className="font-semibold">
                        {selected.meta?.connected_incidents_count ??
                          selected.meta?.incidents_count ??
                          selected.degree}
                      </span>
                    </div>
                    {selected.meta?.gender && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gender / Age:</span>
                        <span>
                          {selected.meta.gender}
                          {selected.meta.age ? `, ${selected.meta.age} yrs` : ""}
                        </span>
                      </div>
                    )}
                    {selected.meta?.description && (
                      <p className="italic text-muted-foreground pt-1">
                        "{selected.meta.description}"
                      </p>
                    )}
                  </div>
                )}

                {/* Graph Analytics Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Degree</span>
                    <br />
                    <b>{selected.degree} connections</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Centrality</span>
                    <br />
                    <b>{selected.centrality.toFixed(3)}</b>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cluster ID</span>
                    <br />
                    <b>#{selected.component}</b>
                  </div>
                  {selected.risk_level && (
                    <div>
                      <span className="text-muted-foreground">Risk Level</span>
                      <br />
                      <span className="font-bold text-destructive">{selected.risk_level}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
