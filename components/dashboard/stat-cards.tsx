import Link from "next/link"
import { Users, Bell, Clock, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { cn } from "@/lib/utils"

interface Stats {
  totalPatients: number
  openAlerts: number
  criticalAlerts: number
  pendingSessions: number
}

export function StatCards({ stats }: { stats: Stats }) {
  const highestLevel =
    stats.criticalAlerts > 0
      ? ("critical" as const)
      : stats.openAlerts > 0
        ? ("high" as const)
        : ("none" as const)

  const cards = [
    {
      label: "Active Patients",
      value: stats.totalPatients,
      icon: Users,
      iconClass: "text-primary",
      href: "/patients",
    },
    {
      label: "Open Alerts",
      value: stats.openAlerts,
      icon: Bell,
      iconClass: "text-severity-critical",
      badge:
        stats.criticalAlerts > 0 ? (
          <SeverityBadge severity="critical" className="ml-2" />
        ) : null,
      highlight: stats.criticalAlerts > 0,
      href: "#alerts",
    },
    {
      label: "Awaiting Response",
      value: stats.pendingSessions,
      icon: Clock,
      iconClass: "text-severity-moderate",
      href: "/patients",
    },
    {
      label: "Highest Alert Level",
      value: null,
      icon: Activity,
      iconClass:
        highestLevel === "critical"
          ? "text-severity-critical"
          : highestLevel === "high"
            ? "text-severity-high"
            : "text-severity-low",
      badge: <SeverityBadge severity={highestLevel} />,
      href: stats.openAlerts > 0 ? "#alerts" : undefined,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => {
        const content = (
          <Card
            className={cn(
              "py-4 shadow-sm transition-colors",
              card.highlight && "border-severity-critical/30",
              card.href && "hover:border-primary/30",
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2 pt-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className={cn("size-4 shrink-0", card.iconClass)} />
            </CardHeader>
            <CardContent className="px-4 pb-0">
              <div className="flex flex-wrap items-center gap-1">
                {card.value !== null && (
                  <span className="text-2xl font-semibold tracking-tight">
                    {card.value}
                  </span>
                )}
                {card.badge}
              </div>
            </CardContent>
          </Card>
        )

        if (!card.href) return <div key={card.label}>{content}</div>

        return (
          <Link key={card.label} href={card.href} className="block">
            {content}
          </Link>
        )
      })}
    </div>
  )
}
