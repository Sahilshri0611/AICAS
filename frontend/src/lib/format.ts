import { format as dfFormat, parseISO } from "date-fns";

export function fmtDate(value?: string | null, pattern = "dd MMM yyyy, HH:mm"): string {
  if (!value) return "—";
  try {
    return dfFormat(parseISO(value), pattern);
  } catch {
    return value;
  }
}

export function fmtNumber(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}

export function fmtCompact(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function fmtPct(n?: number | null, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export const RISK_HEX: Record<string, string> = {
  Critical: "#dc2626",
  High: "#f97316",
  Medium: "#3b82f6",
  Low: "#94a3b8",
};

export const RISK_CLASS: Record<string, string> = {
  Critical: "border-critical/30 bg-critical/10 text-critical",
  High: "border-high/30 bg-high/10 text-high",
  Medium: "border-medium/30 bg-medium/10 text-medium",
  Low: "border-low/30 bg-low/10 text-low",
};

export const CHART_COLORS = [
  "#3b82f6", "#f97316", "#10b981", "#8b5cf6", "#ef4444",
  "#06b6d4", "#eab308", "#ec4899", "#64748b", "#14b8a6",
];
