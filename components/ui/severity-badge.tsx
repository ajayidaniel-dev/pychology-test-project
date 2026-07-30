import { cn } from "@/lib/utils"

export type SeverityLevel = "critical" | "high" | "moderate" | "low" | "none"

const LABELS: Record<SeverityLevel, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  none: "None",
}

/**
 * Text uses the severity *ink* token, never the fill. Setting text in the same
 * colour as its 15% tint cannot reach 4.5:1 at any hue — the previous version
 * measured 2.02:1 to 3.99:1 and failed AA in five of eight theme/level
 * combinations. Ink ramps are verified by scripts/check-contrast.mjs.
 */
const STYLES: Record<SeverityLevel, string> = {
  critical:
    "bg-severity-critical/15 text-severity-critical-ink border-severity-critical/25",
  high: "bg-severity-high/15 text-severity-high-ink border-severity-high/25",
  moderate:
    "bg-severity-moderate/15 text-severity-moderate-ink border-severity-moderate/30",
  low: "bg-severity-low/15 text-severity-low-ink border-severity-low/25",
  none: "bg-muted text-muted-foreground border-border",
}

interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        STYLES[severity],
        className,
      )}
    >
      {LABELS[severity]}
    </span>
  )
}
