import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fmtCompact, fmtPct } from "@/lib/format";
import type { KpiCard } from "@/types";

const ACCENT: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  critical: "bg-critical/10 text-critical",
  high: "bg-high/10 text-high",
  medium: "bg-medium/10 text-medium",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({
  kpi,
  icon: Icon,
  accent = "primary",
}: {
  kpi: KpiCard;
  icon: React.ComponentType<{ className?: string }>;
  accent?: string;
}) {
  const trendUp = kpi.trend === "up";
  const trendDown = kpi.trend === "down";
  const value = kpi.unit === "%" ? `${kpi.value}${kpi.unit}` : fmtCompact(kpi.value);

  return (
    <Card glass className="metric-gradient relative overflow-hidden p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {kpi.label}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", ACCENT[accent] ?? ACCENT.primary)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {kpi.delta !== undefined && kpi.delta !== null ? (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              trendUp && "text-success",
              trendDown && "text-destructive",
              !trendUp && !trendDown && "text-muted-foreground"
            )}
          >
            {trendUp ? <ArrowUpRight className="h-3.5 w-3.5" /> : trendDown ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {fmtPct(Math.abs(kpi.delta))}
          </span>
          <span className="text-muted-foreground">vs previous period</span>
        </div>
      ) : (
        <div className="mt-3 text-xs text-muted-foreground">Live metric</div>
      )}
    </Card>
  );
}
