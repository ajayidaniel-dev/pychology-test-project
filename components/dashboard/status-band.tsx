import Link from "next/link"
import { cn } from "@/lib/utils"

interface Stats {
  totalPatients: number
  openAlerts: number
  criticalAlerts: number
  pendingSessions: number
}

interface Segment {
  label: string
  /** Fits the narrow three-up mobile band; falls back to label. */
  shortLabel?: string
  value: number
  href: string
  ariaLabel: string
  valueClass?: string
  detail?: React.ReactNode
}

/**
 * Dense one-line practice status: patients · open alerts · awaiting response.
 * Severity color appears only on the alert figure, only when real risk exists
 * (Severity Monopoly Rule).
 */
export function StatusBand({ stats }: { stats: Stats }) {
  const segments: Segment[] = [
    {
      label: "Active patients",
      value: stats.totalPatients,
      href: "/patients",
      ariaLabel: `${stats.totalPatients} active patient${stats.totalPatients === 1 ? "" : "s"} — view patients`,
    },
    {
      label: "Open alerts",
      value: stats.openAlerts,
      href: "#alerts",
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
      detail:
        stats.criticalAlerts > 0 ? (
          <span className="text-xs font-medium text-severity-critical">
            {stats.criticalAlerts} critical
          </span>
        ) : null,
    },
    {
      label: "Awaiting response",
      shortLabel: "Awaiting",
      value: stats.pendingSessions,
      href: "/patients",
      ariaLabel: `${stats.pendingSessions} assessment${stats.pendingSessions === 1 ? "" : "s"} awaiting patient response`,
    },
  ]

  return (
    <div className="grid grid-cols-3 divide-x rounded-xl border bg-card shadow-sm">
      {segments.map((segment) => (
        <Link
          key={segment.label}
          href={segment.href}
          aria-label={segment.ariaLabel}
          className="group min-w-0 px-4 py-3 outline-none transition-colors first:rounded-l-xl last:rounded-r-xl hover:bg-accent/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 md:px-6"
        >
          <p className="truncate text-xs font-medium text-muted-foreground">
            {segment.shortLabel ? (
              <>
                <span className="sm:hidden">{segment.shortLabel}</span>
                <span className="hidden sm:inline">{segment.label}</span>
              </>
            ) : (
              segment.label
            )}
          </p>
          <p className="mt-0.5 flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-semibold tracking-tight",
                segment.valueClass,
              )}
            >
              {segment.value}
            </span>
            {segment.detail}
          </p>
        </Link>
      ))}
    </div>
  )
}
