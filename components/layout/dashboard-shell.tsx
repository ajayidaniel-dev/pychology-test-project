"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { CommandPaletteProvider } from "@/components/layout/command-palette"
import { PageShell } from "@/components/layout/page-shell"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { NavCounts } from "@/lib/navigation"

/** Wide list surfaces; everything nested below them is a record or a form. */
const INDEX_ROUTES = ["/dashboard", "/patients", "/batches", "/scales"]

export function DashboardShell({
  children,
  counts,
}: {
  children: React.ReactNode
  counts: NavCounts
}) {
  const pathname = usePathname()
  const width = INDEX_ROUTES.includes(pathname) ? "index" : "detail"

  return (
    <TooltipProvider>
      <CommandPaletteProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width-icon": "4rem",
            } as React.CSSProperties
          }
        >
          <AppSidebar counts={counts} />
          <SidebarInset>
            <DashboardHeader />
            <div className="flex flex-1 flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6 lg:p-8">
              <PageShell width={width}>{children}</PageShell>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </CommandPaletteProvider>
    </TooltipProvider>
  )
}
