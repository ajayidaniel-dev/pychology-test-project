"use client"

import { usePathname } from "next/navigation"
import { stripPracticePrefix } from "@/lib/practice-path"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { CommandPaletteProvider } from "@/components/layout/command-palette"
import { PageShell } from "@/components/layout/page-shell"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { NavCounts } from "@/lib/navigation"
import {
  PracticeProvider,
  usePractice,
} from "@/components/layout/practice-provider"
import type { PracticeOption } from "@/lib/practice"
import type { MembershipRole, PracticeStatus } from "@prisma/client"
import { VerificationBanner } from "@/components/practice/verification-banner"
import { PracticeSwitchOverlay } from "@/components/layout/practice-switch-overlay"
import { practicePath } from "@/lib/practice-path"

/** Wide list surfaces; everything nested below them is a record or a form. */
const INDEX_ROUTES = [
  "/dashboard",
  "/patients",
  "/batches",
  "/scales",
  "/team",
  "/areas",
  "/referrals",
  "/billing",
]

// Compared against the practice-relative path: pathnames now carry a
// `/p/<slug>` prefix, so matching the raw pathname would classify every page as
// a detail view and quietly narrow the list screens.


export function DashboardShell({
  children,
  counts,
  practice,
}: {
  children: React.ReactNode
  counts: NavCounts
  practice: {
    slug: string
    name: string
    practiceId: string
    role: MembershipRole
    status: PracticeStatus
    options: PracticeOption[]
    hasAreas: boolean
  }
}) {
  const pathname = usePathname()
  const width = INDEX_ROUTES.includes(stripPracticePrefix(pathname))
    ? "index"
    : "detail"

  return (
    <PracticeProvider value={practice}>
      <TooltipProvider>
      <CommandPaletteProvider>
        <SidebarProvider
          style={
            {
              "--sidebar-width-icon": "4rem",
            } as React.CSSProperties
          }
        >
          <AppSidebar
            counts={counts}
            role={practice.role}
            hasAreas={practice.hasAreas}
          />
          <SidebarInset>
            <DashboardHeader />
            <div className="flex flex-1 flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-6 lg:p-8">
              <PageShell width={width}>
                <VerificationBanner
                  status={practice.status}
                  role={practice.role}
                  settingsHref={practicePath(practice.slug, "/settings")}
                />
                {children}
              </PageShell>
            </div>
          </SidebarInset>
          <PracticeSwitchOverlayHost />
        </SidebarProvider>
      </CommandPaletteProvider>
      </TooltipProvider>
    </PracticeProvider>
  )
}

function PracticeSwitchOverlayHost() {
  const { switchingTo } = usePractice()
  if (!switchingTo) return null
  return <PracticeSwitchOverlay practiceName={switchingTo.name} />
}
