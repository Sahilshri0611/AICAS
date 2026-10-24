import { useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/auth";
import { useLogin } from "./hooks";
import { apiError } from "@/lib/api";

const DEMO = [
  { role: "Admin", email: "admin@crimesense.ai" },
  { role: "Commissioner", email: "commissioner@crimesense.ai" },
  { role: "Investigator", email: "investigator@crimesense.ai" },
  { role: "Officer", email: "officer@crimesense.ai" },
];

export function LoginPage() {
  const isAuthed = useAuthStore((s) => s.isAuthenticated);
  const [email, setEmail] = useState("admin@crimesense.ai");
  const [password, setPassword] = useState("Password123!");
  const login = useLogin();

  if (isAuthed) return <Navigate to="/" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, #3b82f6 0, transparent 40%), radial-gradient(circle at 80% 70%, #06b6d4 0, transparent 40%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold tracking-tight">CrimeSense AI</span>
        </div>
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            AI-Powered Crime Intelligence & Predictive Analytics
          </h1>
          <p className="max-w-md text-blue-100/80">
            Unified operational intelligence for law enforcement — real-time incident
            mapping, predictive hotspots, FIR parsing and network analysis.
          </p>
          <div className="flex gap-6 pt-4">
            {[["10", "Modules"], ["8K+", "Incidents"], ["ML", "Forecasting"]].map(([n, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold">{n}</p>
                <p className="text-xs uppercase tracking-wider text-blue-200/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-blue-200/50">
          Restricted access • Authorized personnel only
        </p>
      </div>

      {/* Right: form */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">CrimeSense AI</h2>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Access the crime intelligence command center.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {login.isError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {apiError(login.error, "Invalid credentials")}
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Sign in
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-dashed p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Demo accounts (password: Password123!)
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  onClick={() => { setEmail(d.email); setPassword("Password123!"); }}
                  className="rounded-md border bg-card px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                >
                  <span className="block font-medium">{d.role}</span>
                  <span className="block truncate text-muted-foreground">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
