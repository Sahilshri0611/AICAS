/**
 * Reusable Recharts wrappers with consistent theming.
 */
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { CHART_COLORS, RISK_HEX } from "@/lib/format";

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
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
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
        <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={16}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
        </Bar>
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
      <BarChart data={data} margin={{ left: -10, right: 8 }}>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#6366f1" barSize={30} />
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
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="level"
          // Percent radii scale to the space left after the legend, so the ring never clips
          innerRadius="62%"
          outerRadius="95%"
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
          formatter={(v) => <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ForecastArea({
  data,
  height = 320,
}: {
  data: { label: string; predicted: number; lower: number; upper: number; actual?: number | null }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -8, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
        <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} minTickGap={20} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey="upper" stroke="none" fill="url(#band)" />
        <Area type="monotone" dataKey="lower" stroke="none" fill="hsl(var(--card))" />
        <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2} strokeDasharray="4 3" dot={false} />
        <Legend iconType="plainline" formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
      </AreaChart>
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
