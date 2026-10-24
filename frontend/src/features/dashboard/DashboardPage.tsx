import { Link } from "react-router-dom";
import {
  Activity, BellRing, Flame, FileSearch, Gauge, ScrollText,
  LayoutDashboard, MapPin, TrendingUp, ArrowRight, ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { ChartCard } from "@/components/common/ChartCard";
import { CardGridSkeleton, ErrorState } from "@/components/common/states";
import { RiskBadge } from "@/components/common/RiskBadge";
import { Badge } from "@/components/ui/badge";
import { CategoryBar, RiskDonut, TrendLine, WeeklyBar } from "@/components/charts";
import { fmtNumber } from "@/lib/format";
import { useDashboard } from "./hooks";
import type { KpiCard } from "@/types";

const KPI_META: Record<string, { icon: any; accent: string }> = {
  total_incidents: { icon: Activity, accent: "primary" },
  active_alerts: { icon: BellRing, accent: "critical" },
  high_risk_zones: { icon: Flame, accent: "high" },
  cases_under_review: { icon: ScrollText, accent: "medium" },
  prediction_accuracy: { icon: Gauge, accent: "success" },
  ai_parsed_firs: { icon: FileSearch, accent: "info" },
};

export function DashboardPage() {
  const { data, isLoading, isError } = useDashboard();

  return (
    <div>
      <PageHeader
        title="Command Dashboard"
        description="Executive overview of jurisdiction-wide crime activity and intelligence."
        icon={LayoutDashboard}
      />

      {isError && <ErrorState message="Could not load dashboard. Is the backend running & seeded?" />}
      {isLoading && <CardGridSkeleton count={6} />}

      {data && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {data.kpis.map((kpi: KpiCard) => {
              const meta = KPI_META[kpi.key] ?? { icon: Activity, accent: "primary" };
              return <StatCard key={kpi.key} kpi={kpi} icon={meta.icon} accent={meta.accent} />;
            })}
          </div>

          {/* Charts row 1 */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Crimes by Category" description="Top categories across the jurisdiction" className="lg:col-span-2">
              <CategoryBar data={data.crimes_by_category} />
            </ChartCard>
            <ChartCard title="Risk Distribution" description="Incidents by risk level">
              <RiskDonut data={data.risk_distribution} />
            </ChartCard>
          </div>

          {/* Charts row 2 */}
          <div className="grid gap-4 lg:grid-cols-3">
            <ChartCard title="Crime Trend Analysis" description="Daily incident volume (30 days)" className="lg:col-span-2">
              <TrendLine data={data.crime_trend} />
            </ChartCard>
            <ChartCard title="Weekly Incident Trend" description="By day of week">
              <WeeklyBar data={data.weekly_trend} />
            </ChartCard>
          </div>

          {/* Widgets */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Top areas */}
            <ChartCard title="Top Crime Areas" description="Ranked by incident volume" bodyClassName="space-y-2">
              {data.top_areas.slice(0, 6).map((a) => (
                <div key={a.rank} className="flex items-center gap-3 rounded-lg border bg-card/50 p-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                    {a.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.area}</p>
                    <p className="text-xs text-muted-foreground">{fmtNumber(a.incident_count)} incidents</p>
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    risk {a.risk_score.toFixed(2)}
                  </span>
                </div>
              ))}
            </ChartCard>

            {/* Recent feed */}
            <ChartCard
              title="Recent Incident Feed"
              description="Latest filed incidents"
              bodyClassName="space-y-1.5"
              action={
                <Link to="/records" className="text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              }
            >
              {data.recent_incidents.map((r) => (
                <div key={r.crime_id} className="flex items-center gap-2 rounded-lg p-2 hover:bg-accent/50">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.primary_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.crime_id} · {r.area} · {r.occurred_at}
                    </p>
                  </div>
                  <RiskBadge level={r.risk_level} />
                </div>
              ))}
            </ChartCard>

            {/* Emerging hotspots + patrol */}
            <div className="space-y-4">
              <ChartCard title="Emerging Hotspots" description="Rising areas to watch" bodyClassName="space-y-2">
                {data.emerging_hotspots.slice(0, 4).map((a) => (
                  <div key={a.rank} className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-high" />
                    <span className="flex-1 truncate text-sm">{a.area}</span>
                    <Badge variant="warning">{fmtNumber(a.incident_count)}</Badge>
                  </div>
                ))}
              </ChartCard>
              <ChartCard title="Patrol Recommendations" description="AI-suggested deployment" bodyClassName="space-y-2">
                {data.patrol_recommendations.slice(0, 3).map((p) => (
                  <div key={p.area} className="rounded-lg border bg-card/50 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <ShieldAlert className="h-3.5 w-3.5 text-primary" /> {p.area}
                      </span>
                      <Badge variant={p.priority === "Critical" ? "destructive" : "warning"}>
                        {p.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.reason}</p>
                    <p className="mt-0.5 text-xs font-medium text-primary">
                      Suggested units: {p.suggested_units}
                    </p>
                  </div>
                ))}
              </ChartCard>
            </div>
          </div>

          <Link
            to="/analytics"
            className="flex items-center justify-between rounded-xl border border-dashed p-4 text-sm transition-colors hover:bg-accent/50"
          >
            <span className="flex items-center gap-2 font-medium">
              <TrendingUp className="h-4 w-4 text-primary" />
              Explore predictive analytics & crime forecasting
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      )}
    </div>
  );
}
