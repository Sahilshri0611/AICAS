import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/auth";
import { canAccessRoute, ROUTE_CLEARANCE, ROLE_DETAILS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { MapPage } from "@/features/map/MapPage";
import { PatrolPage } from "@/features/patrol/PatrolPage";
import { FIRPage } from "@/features/fir/FIRPage";
import { RecordsPage } from "@/features/records/RecordsPage";
import { AnalyticsPage } from "@/features/analytics/AnalyticsPage";
import { HotspotsPage } from "@/features/hotspots/HotspotsPage";
import { AlertsPage } from "@/features/alerts/AlertsPage";
import { EvidencePage } from "@/features/evidence/EvidencePage";
import { NetworkPage } from "@/features/network/NetworkPage";
import { ModelsPage } from "@/features/models/ModelsPage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { CopilotPage } from "@/features/copilot/CopilotPage";

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  return isAuthed ? children : <Navigate to="/login" replace />;
}

function AccessRestricted({ path }: { path: string }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearance = ROUTE_CLEARANCE[path];
  const requiredRole = clearance ? ROLE_DETAILS[clearance.minRole]?.title : "Elevated Law Enforcement Clearance";
  const userRole = user?.role ? ROLE_DETAILS[user.role]?.title : "Standard Personnel";

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card glass className="max-w-md w-full p-6 text-center space-y-4 border-destructive/30">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Clearance Level Restricted
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Statutory Access Control Protocol • BNSS §173
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs space-y-2 text-left">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Requested Module:</span>
            <span className="font-semibold text-foreground">{clearance?.label || path}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Required Clearance:</span>
            <span className="font-semibold text-amber-500">{requiredRole}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Your Active Role:</span>
            <span className="font-semibold text-foreground">{userRole}</span>
          </div>
          <div className="border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
            Access to this intelligence docket is logged and audited. Contact Police IT Administration or your Zonal DCP for elevated permissions.
          </div>
        </div>

        <Button onClick={() => navigate("/")} className="w-full gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Command Dashboard
        </Button>
      </Card>
    </div>
  );
}

function ProtectedRoute({ path, element }: { path: string; element: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  if (!canAccessRoute(user?.role, path)) {
    return <AccessRestricted path={path} />;
  }
  return element;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/map" element={<ProtectedRoute path="/map" element={<MapPage />} />} />
        <Route path="/patrol" element={<ProtectedRoute path="/patrol" element={<PatrolPage />} />} />
        <Route path="/copilot" element={<ProtectedRoute path="/copilot" element={<CopilotPage />} />} />
        <Route path="/fir" element={<ProtectedRoute path="/fir" element={<FIRPage />} />} />
        <Route path="/records" element={<ProtectedRoute path="/records" element={<RecordsPage />} />} />
        <Route path="/analytics" element={<ProtectedRoute path="/analytics" element={<AnalyticsPage />} />} />
        <Route path="/hotspots" element={<ProtectedRoute path="/hotspots" element={<HotspotsPage />} />} />
        <Route path="/alerts" element={<ProtectedRoute path="/alerts" element={<AlertsPage />} />} />
        <Route path="/evidence" element={<ProtectedRoute path="/evidence" element={<EvidencePage />} />} />
        <Route path="/network" element={<ProtectedRoute path="/network" element={<NetworkPage />} />} />
        <Route path="/models" element={<ProtectedRoute path="/models" element={<ModelsPage />} />} />
        <Route path="/settings" element={<ProtectedRoute path="/settings" element={<SettingsPage />} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
