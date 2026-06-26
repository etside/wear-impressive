"use client";
import { useState } from "react";
import { DashboardSidebar } from "./sidebar";
import { DashboardTopNav } from "./topnav";
import { useDynamicFavicon } from "@/lib/use-dynamic-favicon";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  useDynamicFavicon();
  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardTopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
