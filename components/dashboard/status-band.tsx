import Link from "next/link"
import { AlertTriangle, Clock, Users } from "lucide-react"

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
  note: string
  noteClass?: string
}

/**
 * Practice status as a single band, not three cards.
 *
 * The previous version was three identically-shaped cards, each with an icon, a
 * label, an oversized figure, and a footnote — the hero-metric grid, and one of
 * impeccable's named bans. Three surfaces also implied three peers, when in
 * practice a clinician reads exactly one of these first: whether anything is
 * wrong. One bordered band with divided segments states the same three figures,
 * takes a third of the vertical space, and stops competing with the alert queue
 * directly beneath it.
 *
 * Severity colour appears only on the alert figure, only when real risk exists,
 * and never alone — it always ships with the "N critical" note so the state
 * survives greyscale and colourblindness.
 */
export function StatusBand({ stats }: { stats: Stats }) {
  const segments: Segment[] = [
    {
      label: "Active patients",
      value: stats.totalPatients,
      href: "/patients",
      icon: Users,
      ariaLabel: `${stats.totalPatients} active patient${stats.totalPatients === 1 ? "" : "s"} — view patients`,
      note: "In your caseload",
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
          ? "text-severity-critical-ink"
          : stats.openAlerts > 0
            ? "text-severity-high-ink"
            : undefined,
      note:
        stats.criticalAlerts > 0
          ? `${stats.criticalAlerts} critical`
          : stats.openAlerts > 0
            ? "Needs review"
            : "Nothing needs attention",
      noteClass:
        stats.criticalAlerts > 0
          ? "text-severity-critical-ink font-medium"
          : undefined,
    },
    {
      label: "Awaiting response",
      value: stats.pendingSessions,
      href: "/patients",
      icon: Clock,
      ariaLabel: `${stats.pendingSessions} assessment${stats.pendingSessions === 1 ? "" : "s"} awaiting patient response`,
      note: "Links sent, not yet returned",
    },
  ]

  return (
    <div className="grid grid-cols-1 divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {segments.map((segment) => {
        const Icon = segment.icon
        return (
          <div
            key={segment.label}
            className="relative flex flex-col gap-1 px-5 py-4 transition-colors duration-150 ease-out-quart hover:bg-accent/30"
          >
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {segment.label}
            </p>

            {/* Proportional figures: these never align in a column, and
                tabular-nums reads loose at this size. */}
            <p
              className={cn(
                "text-2xl leading-none font-semibold tracking-tight",
                segment.valueClass,
              )}
            >
              {/* Stretched link: the whole segment is the hit target. */}
              <Link
                href={segment.href}
                aria-label={segment.ariaLabel}
                className="outline-none before:absolute before:inset-0 focus-visible:before:ring-[3px] focus-visible:before:ring-ring/50"
              >
                {segment.value}
              </Link>
            </p>

            <p className={cn("text-xs text-muted-foreground", segment.noteClass)}>
              {segment.note}
            </p>
          </div>
        )
      })}
    </div>
  )
}
