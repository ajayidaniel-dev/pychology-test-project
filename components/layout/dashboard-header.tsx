"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DashboardNavbarActions } from "@/components/layout/dashboard-navbar-actions"

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/patients": "Patients",
  "/scales": "Scales",
  "/settings": "Settings",
}

function getPageTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  if (pathname.startsWith("/patients/")) return "Patient"
  if (pathname.startsWith("/scales/")) return "Scale"
  return "APAS"
}

export function DashboardHeader() {
  const pathname = usePathname()
  const title = getPageTitle(pathname)

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 overflow-visible border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <SidebarTrigger className="-ml-1 size-9 md:hidden" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold md:text-base">
        {title}
      </h1>
      <DashboardNavbarActions />
    </header>
  )
}
