"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { LogOut, Settings } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { HeaderMenu } from "@/components/layout/header-menu"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function DashboardNavbarActions() {
  const { data: session } = useSession()
  const initials = getInitials(session?.user?.name)

  return (
    <div className="flex shrink-0 items-center gap-1">
      <NotificationBell />

      <ThemeToggle />

      <HeaderMenu
        label="Account menu"
        panelClassName="w-56 p-2 max-md:w-auto"
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 rounded-full p-0"
            aria-label="Open account menu"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
              {initials}
            </span>
          </Button>
        }
      >
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium leading-none">
            {session?.user?.name ?? "Clinician"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {session?.user?.email}
          </p>
        </div>
        <Separator className="my-2" />
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2"
          asChild
        >
          <Link href="/settings">
            <Settings className="size-4" />
            Settings
          </Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2 text-destructive hover:text-destructive"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </HeaderMenu>
    </div>
  )
}
