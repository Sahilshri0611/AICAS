import { useNavigate } from "react-router-dom";
import { Menu, Search, Bell, LogOut, User as UserIcon, Moon, Sun, FilePlus2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { initials } from "@/lib/format";
import { useAlertBadge } from "@/features/alerts/hooks";

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [q, setQ] = useState("");
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const alertCount = useAlertBadge();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/records?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl lg:px-6">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
          <Menu className="h-5 w-5" />
        </Button>

        <form onSubmit={submitSearch} className="relative hidden max-w-md flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search FIR no., crime IDs, crime heads, localities…"
            className="pl-9"
          />
        </form>

        <div className="ml-auto flex items-center gap-2">
          {/* Demo Data Badge */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-green-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
           
          </div>

          {/* Statutory Notice Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDisclaimerOpen(true)}
            className="hidden sm:inline-flex h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>BNSS Notice</span>
          </Button>

          <Button size="sm" className="mr-1 hidden sm:inline-flex" onClick={() => navigate("/records?new=1")}>
            <FilePlus2 className="h-4 w-4" /> New Case
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} title="Toggle theme">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/alerts")}>
            <Bell className="h-5 w-5" />
            {alertCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                {alertCount > 99 ? "99+" : alertCount}
              </span>
            )}
          </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full outline-none">
              <Avatar>
                <AvatarFallback>{initials(user?.full_name)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{user?.full_name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                <Badge variant="secondary" className="mt-1.5 w-fit capitalize">
                  {user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <UserIcon /> Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={logout}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    {/* Statutory Law Enforcement Notice Dialog */}
    <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Statutory Law Enforcement Notice (BNSS §173)
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground">CrimeSense AI</strong> is an operational advisory and spatial intelligence platform developed for the Nagpur Police Commissionerate.
          </p>
          <p>
            All predictive hotspots, volume forecasts, risk scorings, and entity extractions are decision-support intelligence under Section 173 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023. Final investigative determinations, charge sheets, and arrest warrants require mandatory human verification by the assigned Investigating Officer (IO).
          </p>
          <p>
            Synthetic baseline crime series and realistic anonymized incident dockets have been loaded across Nagpur's 5 operational zones for pilot and demonstration purposes.
          </p>
          <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-[11px] text-foreground font-mono">
            Tamper-evident SHA-256 evidence vault hashing and immutable audit trails are active on all sessions.
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
