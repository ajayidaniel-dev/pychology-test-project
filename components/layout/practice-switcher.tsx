"use client"

import { useRouter, usePathname } from "next/navigation"
import { Building2, Check, ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { usePractice } from "@/components/layout/practice-provider"
import { PRACTICE_COOKIE, type PracticeOption } from "@/lib/practice"
import { equivalentSectionPath, practicePath } from "@/lib/practice-path"
import { cn } from "@/lib/utils"

const ROLE_LABEL: Record<PracticeOption["role"], string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  CLINICIAN: "Clinician",
  SUPERVISOR: "Supervisor",
  FRONT_DESK: "Front desk",
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

/**
 * The practice switcher.
 *
 * It sits at the top of the sidebar, above everything it scopes, because it is
 * the single most consequential piece of state in the app — every list, badge,
 * search result and alert below it is filtered by this choice. Burying it in
 * the account menu, the usual shortcut, hides the one thing a clinician working
 * across two clinics must never be wrong about.
 */
export function PracticeSwitcher() {
  const { slug, name, options, switchingTo, beginPracticeSwitch } = usePractice()
  const { isMobile, setOpenMobile } = useSidebar()
  const router = useRouter()
  const pathname = usePathname()

  // A single-practice clinician has nothing to switch between; showing a
  // disabled control would be noise. The practice name still renders so it is
  // always clear whose records are on screen.
  const canSwitch = options.length > 1

  function selectPractice(next: PracticeOption) {
    if (next.slug === slug || switchingTo) return

    // Non-authoritative: a preference for account-level pages that carry no
    // slug. Access is always re-derived from membership server-side, so a
    // tampered cookie grants nothing.
    document.cookie = `${PRACTICE_COOKIE}=${encodeURIComponent(next.slug)}; path=/; max-age=31536000; samesite=lax`

    beginPracticeSwitch(next)
    setOpenMobile(false)
    router.push(practicePath(next.slug, equivalentSectionPath(pathname)))
    router.refresh()
  }

  const trigger = (
    <SidebarMenuButton
      size="lg"
      tooltip={name}
      className={cn(
        "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
        "group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
      )}
    >
      <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
        {options.length > 1 ? (
          <span className="text-xs font-semibold">{initials(name)}</span>
        ) : (
          <Building2 className="size-4" aria-hidden />
        )}
      </div>
      <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-xs text-sidebar-foreground/70">
          {canSwitch ? "Switch practice" : "Practice"}
        </span>
      </div>
      {canSwitch ? (
        <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
      ) : null}
    </SidebarMenuButton>
  )

  if (!canSwitch) {
    return (
      <SidebarMenu className="group-data-[collapsible=icon]:w-full">
        <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          {trigger}
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:w-full">
      <SidebarMenuItem className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Your practices
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {options.map((option) => (
              <DropdownMenuItem
                key={option.practiceId}
                onSelect={() => selectPractice(option)}
                disabled={Boolean(switchingTo)}
                className="gap-2"
              >
                <div className="flex aspect-square size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold">
                  {initials(option.name)}
                </div>
                <div className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate text-sm">{option.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {ROLE_LABEL[option.role]}
                  </span>
                </div>
                {option.slug === slug ? (
                  <Check className="size-4 shrink-0" aria-label="Current" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
