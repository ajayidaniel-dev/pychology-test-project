"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HeaderMenu } from "@/components/layout/header-menu"
import { NotificationRow } from "@/components/notifications/notification-item"
import { useNotifications } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"

export function NotificationBell() {
  const { items, unreadCount, loading, markRead, markAllRead } =
    useNotifications()

  const badgeLabel =
    unreadCount > 9 ? "9+" : unreadCount > 0 ? String(unreadCount) : null

  return (
    <HeaderMenu
      label="Notifications"
      fullWidthMobile
      panelClassName="w-80 overflow-hidden max-md:w-auto"
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="size-4" />
          {badgeLabel && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground",
                unreadCount > 9 ? "px-1" : "size-4",
              )}
            >
              {badgeLabel}
            </span>
          )}
        </Button>
      }
    >
      {({ close }) => (
        <>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => markAllRead()}
              >
                Mark all read
              </Button>
            )}
          </div>

          {loading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Loading…
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications yet. Completed assessments and link updates will
              appear here.
            </p>
          ) : (
            <ScrollArea className="max-h-80">
              <div className="space-y-0.5 p-1">
                {items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onRead={markRead}
                    onNavigate={close}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </HeaderMenu>
  )
}
