/**
 * Reusable Recharts wrappers with consistent theming.
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
  ComposedChart,
} from "recharts";
import { CHART_COLORS, RISK_HEX, fmtNumber } from "@/lib/format";

const AXIS = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const GRID = "hsl(var(--border))";

const tooltipStyle = {
  borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
  boxShadow: "0 4px 20px -8px rgba(0,0,0,0.2)",
};

export function CategoryBar({ data }: { data: { category: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis type="number" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="category"
          tick={AXIS}
          width={130}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16} fill="#4f46e5" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLine({
  data,
  color = "#3b82f6",
  height = 280,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function WeeklyBar({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 10, right: 12, top: 10, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={48} domain={[0, "auto"]} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366f1" barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskDonut({
  data,
  height = 280,
}: {
  data: { level: string; count: number }[];
  height?: number;
}) {
  const total = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="level"
            innerRadius="64%"
            outerRadius="90%"
            paddingAngle={2}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={RISK_HEX[d.level] ?? CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend
            verticalAlign="bottom"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: 8 }}
            formatter={(v) => {
              const item = data.find((d) => d.level === v);
              const count = item?.count ?? 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
              return (
                <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>
                  <b className="font-semibold text-foreground">{v}</b>: {fmtNumber(count)} ({pct}%)
                </span>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] -translate-y-1/2 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-foreground">{fmtNumber(total)}</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Incidents</span>
      </div>
    </div>
  );
}

export function ForecastArea({
  data,
  height = 320,
}: {
  data: { label: string; predicted: number; lower: number; upper: number; actual?: number | null }[];
  height?: number;
}) {
  const chartData = data.map((d) => ({
    ...d,
    confidence: [d.lower, d.upper],
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ left: 10, right: 16, top: 12, bottom: 4 }}>
        <defs>
          <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={20} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={45} domain={["auto", "auto"]} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area
          type="monotone"
          dataKey="confidence"
          name="95% Confidence Band"
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="2 2"
          strokeOpacity={0.4}
          fill="url(#bandGradient)"
        />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual Incidents"
          stroke="#10b981"
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: "#10b981", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="predicted"
          name="Predicted Volume"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={{ r: 3.5, fill: "#3b82f6", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
        <Legend
          verticalAlign="bottom"
          wrapperStyle={{ paddingTop: 10 }}
          formatter={(v) => <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{v}</span>}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MetricsBar({
  data,
}: {
  data: { name: string; precision: number; recall: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} domain={[0, 1]} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
        <Legend formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
        <Bar dataKey="precision" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={18} />
        <Bar dataKey="recall" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
