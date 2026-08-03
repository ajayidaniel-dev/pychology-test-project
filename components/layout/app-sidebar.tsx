"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  Layers,
  LayoutDashboard,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react"
import { NavUser } from "@/components/layout/nav-user"
import { SidebarCollapseTrigger } from "@/components/layout/sidebar-collapse-trigger"
import { useCommandPalette } from "@/components/layout/command-palette"
import { PracticeSwitcher } from "@/components/layout/practice-switcher"
import { usePracticeHref } from "@/components/layout/practice-provider"
import { stripPracticePrefix } from "@/lib/practice-path"
import { Button } from "@/components/ui/button"
import type { NavCounts } from "@/lib/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type BadgeKey = keyof NavCounts

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
  /** Exact match only — otherwise every nested route lights this item up. */
  exact?: boolean
  badge?: BadgeKey
  /**
   * Severity styling is permitted here because the figure genuinely means
   * patient risk — the Severity Monopoly Rule is about not spending these
   * colours on anything else, not about avoiding them where risk is real.
   */
  badgeTone?: "neutral" | "critical"
}

/**
 * Grouped navigation.
 *
 * Settings previously sat as a flat peer of Patients and Scales, which read as
 * though configuring your account were a clinical destination. The groups split
 * the three registers apart: where you work, what you administer, and who you
 * are.
 */
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Clinical",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        exact: true,
        badge: "criticalAlerts",
        badgeTone: "critical",
      },
      {
        href: "/patients",
        label: "Patients",
        icon: Users,
        badge: "pendingQuestionnaires",
      },
      { href: "/batches", label: "Batches", icon: Layers },
    ],
  },
  {
    label: "Library",
    items: [{ href: "/scales", label: "Scales", icon: BookOpen }],
  },
  {
    label: "Account",
    items: [{ href: "/settings", label: "Settings", icon: Settings, exact: true }],
  },
]

export function AppSidebar({ counts }: { counts: NavCounts }) {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const { setOpen: setPaletteOpen } = useCommandPalette()
  const practiceHref = usePracticeHref()

  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  function closeMobile() {
    setOpenMobile(false)
  }

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-visible **:data-[slot=sidebar-inner]:overflow-visible"
    >
      <SidebarHeader className="relative gap-3 border-b border-sidebar-border group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        {isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 size-8 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        )}
        <SidebarMenu className="group-data-[collapsible=icon]:w-full">
          <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <SidebarMenuButton
              size="lg"
              asChild
              tooltip="APAS"
              className="group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
            >
              <Link
                href={practiceHref("/dashboard")}
                onClick={closeMobile}
                className="group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground group-data-[collapsible=icon]:size-8">
                  <span className="text-sm font-bold">A</span>
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold">APAS</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">
                    Clinical Overwatch
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* The switcher sits above everything it scopes. Every nav item, badge
            and search result below this line is filtered by the practice chosen
            here, so it cannot live in the account menu at the foot of the rail. */}
        <PracticeSwitcher />

        {/* Search sits in the rail, above navigation — it is the fastest route
            to any record once a caseload outgrows browsing. */}
        <button
          type="button"
          onClick={() => {
            closeMobile()
            setPaletteOpen(true)
          }}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-2.5 text-sm text-sidebar-foreground/70",
            "transition-colors duration-150 ease-out-quart hover:bg-sidebar-accent hover:text-sidebar-foreground",
            "focus-visible:ring-[3px] focus-visible:ring-sidebar-ring/50 focus-visible:outline-none",
            "group-data-[collapsible=icon]:size-9 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
          )}
          aria-label="Search patients, scales and batches"
              aria-keyshortcuts="Meta+K Control+K"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left group-data-[collapsible=icon]:hidden">
            Search…
          </span>
          <kbd className="pointer-events-none rounded border border-sidebar-border bg-sidebar px-1.5 font-mono text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
            ⌘K
          </kbd>
        </button>
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup
            key={group.label}
            className="group-data-[collapsible=icon]:px-1.5"
          >
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(
                  ({ href, label, icon: Icon, exact, badge, badgeTone }) => {
                    const relative = stripPracticePrefix(pathname)
                    const active = exact
                      ? relative === href
                      : relative === href || relative.startsWith(`${href}/`)
                    const count = badge ? counts[badge] : 0
                    const critical = badgeTone === "critical"

                    return (
                      <SidebarMenuItem key={href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={label}>
                          <Link href={practiceHref(href)} onClick={closeMobile}>
                            <Icon />
                            <span className="flex-1">{label}</span>
                            {count > 0 && (
                              <span
                                className={cn(
                                  "ml-auto min-w-5 rounded-full px-1.5 text-center font-mono text-xs leading-5 tabular-nums group-data-[collapsible=icon]:hidden",
                                  critical
                                    ? "bg-severity-critical text-white"
                                    : "bg-sidebar-accent text-sidebar-foreground/80",
                                )}
                                aria-label={
                                  critical
                                    ? `${count} critical alert${count === 1 ? "" : "s"}`
                                    : `${count} awaiting response`
                                }
                              >
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  },
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>

      <SidebarCollapseTrigger />
    </Sidebar>
  )
}
