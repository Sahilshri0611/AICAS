import { useMemo, useRef, useState, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { Share2, Users, MapPin, FileText, GitBranch, Layers, Target } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { useNetwork } from "./hooks";
import type { GraphNode } from "@/types";

const NODE_COLOR: Record<string, string> = {
  Suspect: "#ef4444",
  Incident: "#3b82f6",
  Location: "#10b981",
};
const NODE_ICON: Record<string, any> = { Suspect: Users, Incident: FileText, Location: MapPin };

export function NetworkPage() {
  const { data, isLoading, isError } = useNetwork(250);
  const fgRef = useRef<any>();
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const graphData = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: data.nodes.map((n) => ({ ...n })),
      links: data.edges.map((e) => ({ ...e })),
    };
  }, [data]);

  const paint = useCallback((node: any, ctx: CanvasRenderingContext2D, scale: number) => {
    const size = Math.max(3, 2 + node.degree * 0.6);
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = NODE_COLOR[node.type] ?? "#94a3b8";
    ctx.fill();
    if (scale > 2.5 && node.type !== "Incident") {
      ctx.font = `${10 / scale}px Inter`;
      ctx.fillStyle = "#334155";
      ctx.fillText(String(node.label).slice(0, 18), node.x + size + 1, node.y + 2);
    }
  }, []);

  const stats = data?.stats;

  return (
    <div>
      <PageHeader
        title="Suspect & Network Analysis"
        description="Graph intelligence — connections across suspects, incidents & locations."
        icon={Share2}
      />

      {isLoading && <LoadingState label="Building network graph…" />}
      {isError && <ErrorState />}

      {data && (
        <div className="grid gap-4 lg:grid-cols-4">
          {/* Stats */}
          <div className="space-y-3 lg:col-span-1">
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

            <Card glass className="p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Legend</p>
              {Object.entries(NODE_COLOR).map(([type, color]) => {
                const Icon = NODE_ICON[type];
                return (
                  <div key={type} className="flex items-center gap-2 py-1 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ background: color }} />
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {type}
                  </div>
                );
              })}
            </Card>

            <ChartCard title="High-Centrality Nodes" description="Most connected entities" bodyClassName="space-y-1.5">
              {stats?.top_central_nodes.map((n) => (
                <div key={n.id} className="flex items-center gap-2 rounded-md p-1.5 text-sm">
                  <span className="h-2 w-2 rounded-full" style={{ background: NODE_COLOR[n.type] }} />
                  <span className="flex-1 truncate">{n.label}</span>
                  <Badge variant="secondary">{n.degree}</Badge>
                </div>
              ))}
            </ChartCard>
          </div>

          {/* Graph */}
          <Card glass className="relative overflow-hidden p-0 lg:col-span-3">
            <div className="h-[72vh] w-full">
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                nodeCanvasObject={paint}
                nodePointerAreaPaint={(node: any, color, ctx) => {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, Math.max(4, 2 + node.degree * 0.6), 0, 2 * Math.PI);
                  ctx.fill();
                }}
                linkColor={() => "rgba(100,116,139,0.25)"}
                linkWidth={(l: any) => l.weight * 0.7}
                onNodeClick={(n: any) => setSelected(n)}
                cooldownTicks={100}
                backgroundColor="transparent"
              />
            </div>
            {selected && (
              <div className="absolute bottom-4 right-4 w-64 rounded-xl border bg-card p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: NODE_COLOR[selected.type] }} />
                  <span className="text-sm font-semibold">{selected.type}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{selected.label}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Degree</span><br /><b>{selected.degree}</b></div>
                  <div><span className="text-muted-foreground">Centrality</span><br /><b>{selected.centrality.toFixed(3)}</b></div>
                  <div><span className="text-muted-foreground">Component</span><br /><b>#{selected.component}</b></div>
                  {selected.risk_level && <div><span className="text-muted-foreground">Risk</span><br /><b>{selected.risk_level}</b></div>}
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
