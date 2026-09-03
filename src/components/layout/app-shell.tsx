import type { ReactNode } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden pb-20 lg:pb-0">
      <div
        aria-hidden="true"
        className="experience-grid pointer-events-none absolute inset-0 -z-10"
      />
      <div
        aria-hidden="true"
        className="bg-zhihu/15 pointer-events-none absolute top-20 left-1/2 -z-10 h-px w-[min(92vw,90rem)] -translate-x-1/2 blur-sm"
      />
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
