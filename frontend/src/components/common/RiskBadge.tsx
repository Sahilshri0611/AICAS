import { cn } from "@/lib/utils";
import { RISK_CLASS } from "@/lib/format";

export function RiskBadge({ level, className }: { level: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        RISK_CLASS[level] ?? RISK_CLASS.Low,
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {level}
    </span>
  );
}
