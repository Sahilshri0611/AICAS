import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Map, FileScan, Database, TrendingUp, Flame,
  Bell, Share2, Cpu, Settings, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/map", label: "Incident Map", icon: Map },
  { to: "/fir", label: "FIR Parser", icon: FileScan },
  { to: "/records", label: "Crime Records", icon: Database },
  { to: "/analytics", label: "Predictive Analytics", icon: TrendingUp },
  { to: "/hotspots", label: "Hotspot Intelligence", icon: Flame },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/network", label: "Network Analysis", icon: Share2 },
  { to: "/models", label: "Model Management", icon: Cpu },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ open }: { open: boolean }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card/80 backdrop-blur-xl transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-800 text-white shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-tight">CrimeSense AI</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Intelligence Platform
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn("h-[18px] w-[18px]", isActive && "text-primary")} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg bg-gradient-to-br from-primary/10 to-blue-500/5 p-3">
          <p className="text-xs font-semibold">System Status</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            All systems operational
          </div>
        </div>
      </div>
    </aside>
  );
}
