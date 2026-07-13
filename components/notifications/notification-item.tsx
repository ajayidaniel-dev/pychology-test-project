"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  LogIn,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/hooks/use-notifications"

const TYPE_META: Record<
  string,
  { icon: LucideIcon; iconClass: string }
> = {
  SUICIDAL_IDEATION: {
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
  SEVERITY_CRITICAL: {
    icon: AlertTriangle,
    iconClass: "text-destructive",
  },
  SEVERITY_HIGH: {
    icon: AlertTriangle,
    iconClass: "text-severity-high",
  },
  UNREVIEWED_SEVERE: {
    icon: Bell,
    iconClass: "text-severity-moderate",
  },
  QUESTIONNAIRE_COMPLETED: {
    icon: CheckCircle2,
    iconClass: "text-primary",
  },
  LINK_EXPIRING_SOON: {
    icon: Clock,
    iconClass: "text-severity-moderate",
  },
  LINK_EXPIRED: {
    icon: Clock,
    iconClass: "text-muted-foreground",
  },
  LOGIN: {
    icon: LogIn,
    iconClass: "text-muted-foreground",
  },
}

const LINK_LABELS: Record<string, string> = {
  QUESTIONNAIRE_COMPLETED: "View session",
  SEVERITY_CRITICAL: "Review session",
  SEVERITY_HIGH: "Review session",
  SUICIDAL_IDEATION: "Review session",
  UNREVIEWED_SEVERE: "Review session",
  LINK_EXPIRING_SOON: "View patient",
  LINK_EXPIRED: "View patient",
}

interface NotificationRowProps {
  item: NotificationItem
  onRead: (id: string) => void
  onNavigate?: () => void
}

export function NotificationRow({
  item,
  onRead,
  onNavigate,
}: NotificationRowProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const meta = TYPE_META[item.type] ?? {
    icon: Bell,
    iconClass: "text-muted-foreground",
  }
  const Icon = meta.icon
  const unread = !item.readAt
  const href = item.href
  const linkLabel = LINK_LABELS[item.type]

  async function markReadIfNeeded() {
    if (unread) await onRead(item.id)
  }

  async function handleReadMore(event: React.MouseEvent) {
    event.stopPropagation()
    await markReadIfNeeded()
    setExpanded((value) => !value)
  }

  async function handleOpenLink(event: React.MouseEvent) {
    event.stopPropagation()
    if (!href) return
    await markReadIfNeeded()
    onNavigate?.()
    router.push(href)
  }

  return (
    <div
      className={cn(
        "rounded-md px-2 py-2.5 transition-colors",
        unread && "bg-accent/40",
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted",
            meta.iconClass,
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("text-sm leading-snug", unread && "font-medium")}>
              {item.title}
            </p>
            {unread && (
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                aria-hidden
              />
            )}
          </div>
          <p
            className={cn(
              "text-xs text-muted-foreground",
              !expanded && "line-clamp-2",
            )}
          >
            {item.body}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={handleReadMore}
              className="text-xs font-medium text-primary hover:underline"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
            {href && linkLabel && (
              <button
                type="button"
                onClick={handleOpenLink}
                className="text-xs font-medium text-primary hover:underline"
              >
                {linkLabel}
              </button>
            )}
            <p className="text-xs text-muted-foreground/80">
              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
