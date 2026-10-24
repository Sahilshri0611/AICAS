import { useState } from "react";
import {
  Cpu, RefreshCw, CheckCircle2, Archive, Loader2, Grid3x3,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingState, EmptyState } from "@/components/common/states";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { apiError } from "@/lib/api";
import { useModels, useRetrain, useActivateModel, useArchiveModel } from "./hooks";
import type { MLModel } from "@/types";

const MODEL_TYPES = ["Hotspot Prediction", "Crime Volume Forecast", "Area Risk Forecast"];

export function ModelsPage() {
  const { data, isLoading } = useModels();
  const retrain = useRetrain();
  const activate = useActivateModel();
  const archive = useArchiveModel();
  const [type, setType] = useState(MODEL_TYPES[0]);
  const [selected, setSelected] = useState<MLModel | null>(null);

  const active = selected ?? data?.find((m) => m.status === "Active") ?? data?.[0] ?? null;

  const trend = (data ?? [])
    .filter((m) => m.accuracy != null)
    .slice()
    .reverse()
    .map((m) => ({
      name: m.version,
      accuracy: m.accuracy,
      f1: m.f1_score,
    }));

  const doRetrain = () =>
    retrain.mutate(type, {
      onSuccess: () => toast.success("Model retrained", `New ${type} version is active`),
      onError: (e) => toast.error("Retrain failed", apiError(e)),
    });

  return (
    <div>
      <PageHeader
        title="Model Management"
        description="Track, evaluate and manage the ML prediction models."
        icon={Cpu}
        actions={
          <div className="flex gap-2">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MODEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={doRetrain} disabled={retrain.isPending}>
              {retrain.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Retrain
            </Button>
          </div>
        }
      />

      {isLoading && <LoadingState />}
      {data && data.length === 0 && (
        <EmptyState title="No models trained yet" description="Click Retrain to train the first model." />
      )}

      {data && data.length > 0 && (
        <div className="space-y-6">
          {/* Metrics of active/selected model */}
          {active && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Accuracy", active.accuracy],
                ["Precision", active.precision],
                ["Recall", active.recall],
                ["F1 Score", active.f1_score],
              ].map(([label, v]) => (
                <Card key={label as string} glass className="metric-gradient p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums">
                    {v != null ? `${((v as number) * 100).toFixed(1)}%` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{active.name} {active.version}</p>
                </Card>
              ))}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Metrics trend */}
            <ChartCard title="Metrics Trend" description="Accuracy & F1 across versions">
              {trend.length > 1 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trend} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", fontSize: 12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="accuracy" stroke="#3b82f6" strokeWidth={2} />
                    <Line type="monotone" dataKey="f1" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Not enough versions" description="Retrain a few times to see the trend." />
              )}
            </ChartCard>

            {/* Confusion matrix */}
            <ChartCard title="Confusion Matrix" description={`${active?.name ?? ""} ${active?.version ?? ""}`}>
              {active?.confusion_matrix ? (
                <ConfusionMatrix matrix={active.confusion_matrix} labels={active.class_labels ?? []} />
              ) : (
                <EmptyState title="No matrix" description="Forecast models are regression-based." />
              )}
            </ChartCard>
          </div>

          {/* Feature importances */}
          {active?.feature_importances && Object.keys(active.feature_importances).length > 0 && (
            <ChartCard title="Feature Importances" description="Model input drivers" bodyClassName="space-y-2">
              {Object.entries(active.feature_importances)
                .sort((a, b) => b[1] - a[1])
                .map(([f, v]) => (
                  <div key={f} className="flex items-center gap-3">
                    <span className="w-32 text-xs font-medium">{f}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${v * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{(v * 100).toFixed(1)}%</span>
                  </div>
                ))}
            </ChartCard>
          )}

          {/* Version registry */}
          <Card glass className="overflow-hidden">
            <div className="border-b px-4 py-3 text-sm font-semibold">Model Version History</div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Algorithm</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>F1</TableHead>
                  <TableHead>Trained</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => setSelected(m)}>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell className="font-mono text-xs">{m.version}</TableCell>
                    <TableCell className="text-muted-foreground">{m.algorithm}</TableCell>
                    <TableCell>{m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}</TableCell>
                    <TableCell>{m.f1_score != null ? `${(m.f1_score * 100).toFixed(1)}%` : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(m.trained_at)}</TableCell>
                    <TableCell>
                      <Badge variant={m.status === "Active" ? "success" : m.status === "Archived" ? "secondary" : "default"}>
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {m.status !== "Active" && (
                          <Button size="sm" variant="ghost" onClick={() => activate.mutate(m.id, { onSuccess: () => toast.success("Activated") })}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {m.status !== "Archived" && (
                          <Button size="sm" variant="ghost" onClick={() => archive.mutate(m.id, { onSuccess: () => toast.success("Archived") })}>
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}

function ConfusionMatrix({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const max = Math.max(...matrix.flat(), 1);
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">
          <Grid3x3 className="mb-1 h-4 w-4" /> Predicted →
        </span>
        <div>
          <div className="flex gap-1 pl-16">
            {labels.map((l) => <div key={l} className="w-16 text-center text-xs font-medium">{l}</div>)}
          </div>
          {matrix.map((row, i) => (
            <div key={i} className="mt-1 flex items-center gap-1">
              <div className="w-16 text-right text-xs font-medium">{labels[i]}</div>
              {row.map((v, j) => (
                <div
                  key={j}
                  className={cn("flex h-16 w-16 items-center justify-center rounded-lg text-sm font-bold",
                    i === j ? "text-white" : "text-foreground")}
                  style={{ background: i === j ? `rgba(59,130,246,${0.35 + (v / max) * 0.65})` : `rgba(148,163,184,${0.1 + (v / max) * 0.4})` }}
                >
                  {v}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
