import { cn } from "@/lib/utils"

export type SeverityLevel = "critical" | "high" | "moderate" | "low" | "none"

const LABELS: Record<SeverityLevel, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  none: "None",
}

const STYLES: Record<SeverityLevel, string> = {
  critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/25",
  high: "bg-severity-high/15 text-severity-high border-severity-high/25",
  moderate: "bg-severity-moderate/15 text-severity-moderate border-severity-moderate/30",
  low: "bg-severity-low/15 text-severity-low border-severity-low/25",
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
