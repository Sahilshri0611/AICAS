import { Settings, ShieldCheck, Users, Check, X } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ChartCard } from "@/components/common/ChartCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/common/states";
import { useAuthStore } from "@/store/auth";
import { initials, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermissionMatrix, useUsers } from "./hooks";

const ALL_PERMS = [
  "view_incidents", "create_incident", "edit_incident", "delete_incident",
  "export_records", "parse_fir", "view_alerts", "manage_alerts",
  "view_analytics", "manage_models", "view_network", "manage_users", "view_audit",
];
const ROLE_ORDER = ["officer", "investigator", "commander", "commissioner", "admin"];

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const matrix = usePermissionMatrix();
  const isAdmin = user?.role === "admin";
  const users = useUsers(!!isAdmin);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Profile, access control and user administration."
        icon={Settings}
      />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="rbac">Access Control (RBAC)</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card glass className="max-w-lg p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{initials(user?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold">{user?.full_name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <Badge variant="secondary" className="mt-1.5 capitalize">{user?.role}</Badge>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-muted-foreground">Badge Number</p><p className="font-medium">{user?.badge_number ?? "—"}</p></div>
              <div><p className="text-muted-foreground">Department</p><p className="font-medium">{user?.department ?? "—"}</p></div>
              <div><p className="text-muted-foreground">Status</p><p className="font-medium">{user?.is_active ? "Active" : "Disabled"}</p></div>
              <div><p className="text-muted-foreground">Member Since</p><p className="font-medium">{fmtDate(user?.created_at, "MMM yyyy")}</p></div>
            </div>
          </Card>
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
