import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore } from "@/store/auth";
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
        <Route path="/map" element={<MapPage />} />
        <Route path="/patrol" element={<PatrolPage />} />
        <Route path="/copilot" element={<CopilotPage />} />
        <Route path="/fir" element={<FIRPage />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/hotspots" element={<HotspotsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/evidence" element={<EvidencePage />} />
        <Route path="/network" element={<NetworkPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
