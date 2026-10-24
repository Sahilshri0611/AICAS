import { useState } from "react";
import {
  Bell, Check, UserPlus, XCircle, MessageSquarePlus, AlertTriangle,
  Activity, ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState, EmptyState, ErrorState } from "@/components/common/states";
import { RiskDonut, TrendLine } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { fmtDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { apiError } from "@/lib/api";
import {
  useAlerts, useAlertDashboard, useAcknowledgeAlert, useCloseAlert, useAddAlertNote,
} from "./hooks";
import type { Alert } from "@/types";

const SEV_STYLE: Record<string, string> = {
  Critical: "border-l-critical",
  High: "border-l-high",
  Medium: "border-l-medium",
  Low: "border-l-low",
};
const SEV_BADGE: Record<string, any> = {
  Critical: "destructive", High: "warning", Medium: "default", Low: "secondary",
};

export function AlertsPage() {
  const [status, setStatus] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [noteFor, setNoteFor] = useState<Alert | null>(null);
  const [noteBody, setNoteBody] = useState("");

  const { data, isLoading, isError } = useAlerts({
    status: status === "all" ? undefined : status,
    severity: severity === "all" ? undefined : severity,
  });
  const dash = useAlertDashboard();
  const ack = useAcknowledgeAlert();
  const close = useCloseAlert();
  const addNote = useAddAlertNote();

  const doAck = (a: Alert) =>
    ack.mutate({ id: a.id }, {
      onSuccess: () => toast.success("Alert acknowledged"),
      onError: (e) => toast.error("Action failed", apiError(e)),
    });
  const doClose = (a: Alert) =>
    close.mutate({ id: a.id }, {
      onSuccess: () => toast.success("Alert closed"),
      onError: (e) => toast.error("Action failed", apiError(e)),
    });
  const submitNote = () => {
    if (!noteFor || !noteBody.trim()) return;
    addNote.mutate(
      { id: noteFor.id, body: noteBody.trim() },
      {
        onSuccess: () => { toast.success("Note added"); setNoteFor(null); setNoteBody(""); },
        onError: (e) => toast.error("Failed", apiError(e)),
      }
    );
  };

  return (
    <div>
      <PageHeader
        title="Alert Management"
        description="Real-time threat alerting — acknowledge, assign and resolve."
        icon={Bell}
      />

      {/* Dashboard tiles */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <StatCard
          kpi={{ key: "active", label: "Active Alerts", value: dash.data?.active_count ?? 0, trend: "up" }}
          icon={ShieldAlert}
          accent="critical"
        />
        <ChartCard title="Alert Severity" description="Current distribution" className="md:col-span-1">
          {dash.data && <RiskDonut data={dash.data.severity_distribution} height={200} />}
        </ChartCard>
        <ChartCard title="Alert Trends" description="Volume (7 days)" className="md:col-span-2">
          {dash.data && <TrendLine data={dash.data.trend} color="#ef4444" height={180} />}
        </ChartCard>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {["all", "Active", "Acknowledged", "Assigned", "Closed"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            {["all", "Critical", "High", "Medium", "Low"].map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "All severities" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState label="Loading alerts…" />}
      {isError && <ErrorState />}
      {data && data.items.length === 0 && <EmptyState title="No alerts match your filters" />}

      <div className="space-y-3">
        {data?.items.map((a) => (
          <div
            key={a.id}
            className={cn(
              "glass-card border-l-4 p-4",
              SEV_STYLE[a.severity] ?? SEV_STYLE.Low,
              a.status === "Closed" && "opacity-60"
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{a.title}</span>
                  <Badge variant={SEV_BADGE[a.severity]}>{a.severity}</Badge>
                  <Badge variant="secondary">{a.category}</Badge>
                  <Badge variant="outline">{a.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.message}</p>
                {a.recommended_action && (
                  <p className="mt-1 text-xs text-primary">
                    <Activity className="mr-1 inline h-3 w-3" />
                    {a.recommended_action}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {a.area_name} · {fmtDate(a.created_at)}
                </p>
                {a.notes.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2">
                    {a.notes.map((n) => (
                      <p key={n.id} className="text-xs">
                        <span className="font-medium">{n.author_name ?? "Officer"}:</span> {n.body}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1.5">
                {a.status === "Active" && (
                  <Button size="sm" variant="outline" onClick={() => doAck(a)}>
                    <Check className="h-3.5 w-3.5" /> Acknowledge
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setNoteFor(a)}>
                  <MessageSquarePlus className="h-3.5 w-3.5" /> Note
                </Button>
                {a.status !== "Closed" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => doClose(a)}>
                    <XCircle className="h-3.5 w-3.5" /> Close
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!noteFor} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add note to alert</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Add an investigation note or action taken…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button onClick={submitNote} disabled={addNote.isPending}>Add note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
