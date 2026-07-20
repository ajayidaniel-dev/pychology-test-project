"use client"

import { useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, LayoutDashboard, Settings, Users, X } from "lucide-react"
import { NavUser } from "@/components/layout/nav-user"
import { SidebarCollapseTrigger } from "@/components/layout/sidebar-collapse-trigger"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/scales", label: "Scales", icon: BookOpen },
  { href: "/settings", label: "Settings", icon: Settings },
] as const

export function AppSidebar() {
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

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
      <SidebarHeader className="relative border-b border-sidebar-border group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
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
                href="/dashboard"
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
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="group-data-[collapsible=icon]:px-1.5">
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : href === "/settings"
                      ? pathname === "/settings"
                      : pathname.startsWith(href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={label}
                    >
                      <Link href={href} onClick={closeMobile}>
                        <Icon />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser />
      </SidebarFooter>

      <SidebarCollapseTrigger />
    </Sidebar>
  )
}
