import { TrendingUp, Target, Crosshair, Activity, Gauge } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/common/states";
import { ForecastArea } from "@/components/charts";
import { cn } from "@/lib/utils";
import { usePredictive } from "./hooks";

const METRIC_META = [
  { key: "accuracy", label: "Accuracy", icon: Gauge },
  { key: "precision", label: "Precision", icon: Target },
  { key: "recall", label: "Recall", icon: Crosshair },
  { key: "f1_score", label: "F1 Score", icon: Activity },
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function heatColor(v: number) {
  // blue -> orange -> red
  if (v >= 0.75) return "bg-red-500";
  if (v >= 0.5) return "bg-orange-400";
  if (v >= 0.25) return "bg-blue-400";
  if (v > 0) return "bg-blue-200";
  return "bg-muted";
}

export function AnalyticsPage() {
  const { data, isLoading, isError } = usePredictive();

  return (
    <div>
      <PageHeader
        title="Predictive Analytics"
        description="ML-powered crime forecasting for Nagpur City Police jurisdictions."
        icon={TrendingUp}
      />

      {isLoading && <LoadingState label="Running forecasts…" />}
      {isError && <ErrorState message="Could not load analytics. Ensure the backend is seeded." />}

      {data && (
        <div className="space-y-6">
          {/* Model metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRIC_META.map((m) => {
              const val = (data.metrics as any)[m.key] as number;
              return (
                <Card key={m.key} glass className="metric-gradient p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{m.label}</p>
                    <m.icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-2 text-3xl font-bold tabular-nums">{(val * 100).toFixed(1)}%</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${val * 100}%` }} />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Volume forecast */}
          <ChartCard
            title="Crime Volume Forecast"
            description="14-day forecast with 95% confidence bands (green = actual, blue dashed = predicted)"
          >
            <ForecastArea data={data.volume_forecast.series} />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Weekly forecast */}
            <ChartCard title="Weekly Forecast" description="Next 7 days predicted volume">
              <ForecastArea data={data.weekly_forecast} height={280} />
            </ChartCard>

            {/* High risk areas */}
            <ChartCard title="High Risk Area Prediction" description="Forecast risk vs current" bodyClassName="space-y-2">
              {data.high_risk_areas.map((a) => (
                <div key={a.area} className="rounded-lg border bg-card/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{a.area}</span>
                    <span className="text-xs text-muted-foreground">conf {Math.round(a.confidence * 100)}%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      Current <b className="text-foreground">{a.current_risk.toFixed(2)}</b>
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">
                      Predicted <b className={cn(a.predicted_risk > a.current_risk ? "text-destructive" : "text-success")}>
                        {a.predicted_risk.toFixed(2)}
                      </b>
                    </span>
                    <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-high" style={{ width: `${a.predicted_risk * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </ChartCard>
          </div>

          {/* Time-based prediction heatmap */}
          <ChartCard title="Time-Based Prediction" description="Incident intensity by day of week × hour of day">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="mb-1 flex gap-1 pl-10">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="w-5 text-center text-[9px] text-muted-foreground">
                      {h % 3 === 0 ? h : ""}
                    </div>
                  ))}
                </div>
                {DAYS.map((day) => (
                  <div key={day} className="mb-1 flex items-center gap-1">
                    <div className="w-9 text-xs font-medium text-muted-foreground">{day}</div>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const cell = data.time_heatmap.find((c) => c.day === day && c.hour === h);
                      const v = cell?.value ?? 0;
                      return (
                        <div
                          key={h}
                          title={`${day} ${h}:00 — ${(v * 100).toFixed(0)}%`}
                          className={cn("h-5 w-5 rounded-sm", heatColor(v))}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
