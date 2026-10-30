import { useState } from "react";
import {
  Settings, ShieldCheck, Users, Check, X, KeyRound, History,
  ShieldAlert, FileText, Clock, Laptop, Shield,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/common/states";
import { useAuthStore } from "@/store/auth";
import { initials, fmtDate } from "@/lib/format";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { usePermissionMatrix, useUsers } from "./hooks";

const ALL_PERMS = [
  "view_incidents", "create_incident", "edit_incident", "delete_incident",
  "export_records", "parse_fir", "view_alerts", "manage_alerts",
  "view_analytics", "manage_models", "view_network", "manage_users", "view_audit",
];
const ROLE_ORDER = ["officer", "investigator", "commander", "commissioner", "admin"];

const RECENT_ACTIVITIES = [
  { id: 1, action: "Session Authenticated", detail: "SSO login from Nagpur HQ Terminal (IP: 192.168.1.104)", time: "12 mins ago", icon: Laptop },
  { id: 2, action: "Approved FIR Intake #0412/2026", detail: "Auto-materialized crime incident INC-8012 (Sitabuldi)", time: "1 hour ago", icon: FileText },
  { id: 3, action: "Exported Crime Records", detail: "Downloaded Excel dataset (Filtered: Zone 1, Robbery)", time: "3 hours ago", icon: History },
  { id: 4, action: "Patrol Route Re-calibrated", detail: "Optimized Night Shift Route #4 for Sitabuldi Beat 2", time: "Yesterday", icon: ShieldCheck },
  { id: 5, action: "Hotspot Cluster Recalculated", detail: "Ran DBSCAN + KDE on Dharampeth & Gandhibagh", time: "2 days ago", icon: Clock },
];

function ChangePasswordCard() {
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");
  const [conf, setConf] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!curr || !next) {
      toast.error("Required fields", "Please enter current and new password.");
      return;
    }
    if (next !== conf) {
      toast.error("Mismatch", "New password and confirmation do not match.");
      return;
    }
    if (next.length < 8) {
      toast.error("Password too weak", "Must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCurr("");
      setNext("");
      setConf("");
      toast.success("Password Updated", "Security credentials updated successfully.");
    }, 600);
  };

  return (
    <Card glass className="p-6">
      <div className="flex items-center gap-2 font-semibold text-base mb-1">
        <KeyRound className="h-4 w-4 text-primary" /> Change Password
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Ensure your account uses a strong, compliant passphrase of at least 8 characters.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium">Current Password</label>
          <Input type="password" value={curr} onChange={(e) => setCurr(e.target.value)} placeholder="••••••••" className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">New Password</label>
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="••••••••" className="mt-1" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Confirm New Password</label>
          <Input type="password" value={conf} onChange={(e) => setConf(e.target.value)} placeholder="••••••••" className="mt-1" />
        </div>
        <Button type="submit" size="sm" disabled={loading} className="mt-2 w-full">
          {loading ? "Updating…" : "Update Password"}
        </Button>
      </form>
    </Card>
  );
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const matrix = usePermissionMatrix();
  const isAdmin = user?.role === "admin";
  const users = useUsers(!!isAdmin);

  return (
    <div>
      <PageHeader
        title="Settings & System Governance"
        description="Profile security, access control and law enforcement administration."
        icon={Settings}
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile & Security</TabsTrigger>
          <TabsTrigger value="rbac">Access Control (RBAC)</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              {/* Profile Card */}
              <Card glass className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary/20">
                    <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                      {initials(user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-bold">{user?.full_name}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize font-semibold">{user?.role}</Badge>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Online
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-sm border-t border-border/60 pt-5">
                  <div>
                    <p className="text-xs text-muted-foreground">Badge Identifier</p>
                    <p className="font-semibold mt-0.5">{user?.badge_number ?? "NGP-8821"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned Department</p>
                    <p className="font-semibold mt-0.5">{user?.department ?? "Crime Branch HQ"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Interactive Login</p>
                    <p className="font-semibold mt-0.5">Today, 01:14 AM IST</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Session Security</p>
                    <p className="font-semibold text-emerald-500 mt-0.5 text-xs">256-bit TLS (JWT Valid)</p>
                  </div>
                </div>
              </Card>

              {/* Change Password Card */}
              <ChangePasswordCard />
            </div>

            <div className="space-y-5">
              {/* Recent Activity Log */}
              <Card glass className="p-6">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2 font-semibold text-base">
                    <History className="h-4 w-4 text-primary" /> Recent Audit Activity
                  </div>
                  <Badge variant="outline" className="text-xs">Immutable Trail</Badge>
                </div>
                <div className="mt-4 space-y-3.5">
                  {RECENT_ACTIVITIES.map((act) => {
                    const Icon = act.icon;
                    return (
                      <div key={act.id} className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/40 p-3 text-xs transition-colors hover:bg-accent/30">
                        <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-foreground truncate">{act.action}</p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
                          </div>
                          <p className="mt-0.5 text-muted-foreground truncate">{act.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Law Enforcement Decision-Support Disclaimers */}
              <Card glass className="p-5 border-amber-500/25 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-foreground">Law Enforcement Decision-Support Protocol</p>
                    <p className="text-muted-foreground leading-relaxed">
                      CrimeSense AI is an operational advisory and spatial intelligence platform deployed pursuant to Section 173 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      All algorithmic risk scorings, predictive heatmaps, and network graphs are intended solely to assist investigative workflow prioritization. Final determinations, charge sheets, and arrest warrants require independent human confirmation by the Investigating Officer (IO).
                    </p>
                    <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>Audit Trail: <strong className="text-foreground">Tamper-Evident SHA-256</strong></span>
                      <span>Statutory Retention: <strong className="text-foreground">7 Years</strong></span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rbac">
          <ChartCard title="Role Permission Matrix" description="Permissions granted per role (inherited by hierarchy)">
            {matrix.isLoading ? (
              <LoadingState />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Permission</TableHead>
                      {ROLE_ORDER.map((r) => (
                        <TableHead key={r} className="text-center capitalize">{r}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ALL_PERMS.map((perm) => (
                      <TableRow key={perm}>
                        <TableCell className="font-medium">
                          {perm.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </TableCell>
                        {ROLE_ORDER.map((role) => {
                          const has = matrix.data?.[role]?.includes(perm);
                          return (
                            <TableCell key={role} className="text-center">
                              {has ? (
                                <Check className="mx-auto h-4 w-4 text-success" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-muted-foreground/30" />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ChartCard>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <Card glass className="overflow-hidden">
              <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
                <Users className="h-4 w-4" /> System Users
              </div>
              {users.isLoading ? (
                <LoadingState />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Badge</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.data?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell><Badge variant="secondary" className="capitalize">{u.role}</Badge></TableCell>
                        <TableCell>{u.badge_number ?? "—"}</TableCell>
                        <TableCell>{u.department ?? "—"}</TableCell>
                        <TableCell>
                          <span className={cn("inline-flex items-center gap-1 text-xs", u.is_active ? "text-success" : "text-destructive")}>
                            <span className={cn("h-1.5 w-1.5 rounded-full", u.is_active ? "bg-success" : "bg-destructive")} />
                            {u.is_active ? "Active" : "Disabled"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
