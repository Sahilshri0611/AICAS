import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils";

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen app-gradient-bg">
      <Sidebar open={open} />
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} />
      )}
      <div className={cn("lg:pl-64")}>
        <Topbar onMenu={() => setOpen((o) => !o)} />
        <main className="mx-auto max-w-[1600px] p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
