import Link from "next/link"
import { AlertTriangle, Clock, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Stats {
  totalPatients: number
  openAlerts: number
  criticalAlerts: number
  pendingSessions: number
}

interface Segment {
  label: string
  value: number
  href: string
  ariaLabel: string
  icon: React.ElementType
  valueClass?: string
  badge?: React.ReactNode
  footnote: string
}

/**
 * Practice status at a glance: patients · open alerts · awaiting response.
 * Severity color appears only on the alert figure, only when real risk exists
 * (Severity Monopoly Rule), and never alone — it always ships with the
 * "N critical" badge so the state survives colorblindness and grayscale.
 */
export function StatusBand({ stats }: { stats: Stats }) {
  const segments: Segment[] = [
    {
      label: "Active patients",
      value: stats.totalPatients,
      href: "/patients",
      icon: Users,
      ariaLabel: `${stats.totalPatients} active patient${stats.totalPatients === 1 ? "" : "s"} — view patients`,
      footnote: "In your caseload",
    },
    {
      label: "Open alerts",
      value: stats.openAlerts,
      href: "#alerts",
      icon: AlertTriangle,
      ariaLabel:
        stats.criticalAlerts > 0
          ? `${stats.openAlerts} open alerts, ${stats.criticalAlerts} critical — view alert queue`
          : `${stats.openAlerts} open alert${stats.openAlerts === 1 ? "" : "s"} — view alert queue`,
      valueClass:
        stats.criticalAlerts > 0
          ? "text-severity-critical"
          : stats.openAlerts > 0
            ? "text-severity-high"
            : undefined,
      badge:
        stats.criticalAlerts > 0 ? (
          <Badge
            variant="outline"
            className="border-severity-critical/30 bg-severity-critical/10 text-severity-critical"
          >
            <AlertTriangle className="size-3" aria-hidden />
            {stats.criticalAlerts} critical
          </Badge>
        ) : null,
      footnote:
        stats.openAlerts > 0 ? "Needs review" : "Nothing needs attention",
    },
    {
      label: "Awaiting response",
      value: stats.pendingSessions,
      href: "/patients",
      icon: Clock,
      ariaLabel: `${stats.pendingSessions} assessment${stats.pendingSessions === 1 ? "" : "s"} awaiting patient response`,
      footnote: "Links sent, not yet returned",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {segments.map((segment) => {
        const Icon = segment.icon
        return (
          <Card
            key={segment.label}
            className="relative gap-2 py-5 transition-colors hover:border-ring/40 hover:bg-accent/30"
          >
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <Icon className="size-3.5" aria-hidden />
                {segment.label}
              </CardDescription>
              {/* Proportional figures: tabular-nums looks loose at display size,
                  and these values never align in a column. */}
              <CardTitle
                className={cn(
                  "text-3xl font-semibold tracking-tight",
                  segment.valueClass,
                )}
              >
                {/* Stretched link: the whole card is the hit target. */}
                <Link
                  href={segment.href}
                  aria-label={segment.ariaLabel}
                  className="rounded-xl outline-none before:absolute before:inset-0 before:rounded-xl focus-visible:before:ring-[3px] focus-visible:before:ring-ring/50"
                >
                  {segment.value}
                </Link>
              </CardTitle>
              {segment.badge && <CardAction>{segment.badge}</CardAction>}
            </CardHeader>
            <CardFooter>
              <p className="text-xs text-muted-foreground">{segment.footnote}</p>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
