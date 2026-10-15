import { cn } from "@/lib/utils"
import type { SeverityLevel } from "@/components/ui/severity-badge"

/** Filled segments per band. Order matters: it is the whole point of the mark. */
const FILLED: Record<SeverityLevel, number> = {
  none: 1,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
}

/**
 * Ink, not fill. The fill tones are tuned for 15%-opacity badge backgrounds and
 * several of them sit near 2:1 against a light card — fine behind text, far too
 * weak for a 4px bar that has to be seen on its own. Ink clears the 3:1 that
 * WCAG 1.4.11 asks of non-text marks; `scripts/check-contrast.mjs` enforces it.
 */
const FILL_CLASS: Record<SeverityLevel, string> = {
  none: "bg-muted-foreground/40",
  low: "bg-severity-low-ink",
  moderate: "bg-severity-moderate-ink",
  high: "bg-severity-high-ink",
  critical: "bg-severity-critical-ink",
}

const LABEL: Record<SeverityLevel, string> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
}

const SEGMENTS = 4

interface SeverityMeterProps {
  severity: SeverityLevel | null
  className?: string
}

/**
 * Discrete severity indicator for dense rows.
 *
 * Magnitude is carried by the *number of filled segments*, not by hue alone, so
 * the caseload's shape is readable at a glance and stays readable to a
 * colour-blind clinician — the failure mode a colour-only rail or badge has.
 * Colour reinforces; it does not carry.
 *
 * Renders nothing for an unassessed patient: an empty meter would read as
 * "measured, and fine", which is a different and more dangerous claim than
 * "not measured".
 */
export function SeverityMeter({ severity, className }: SeverityMeterProps) {
  if (!severity) {
    return (
      <span className={cn("text-muted-foreground", className)} aria-label="Not assessed">
        —
      </span>
    )
  }

  const filled = FILLED[severity]

  return (
    <span
      className={cn("inline-flex items-center gap-0.75 align-middle", className)}
      role="img"
      aria-label={`Severity: ${LABEL[severity]}`}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "h-3.5 w-1 rounded-[1px] transition-colors duration-150 ease-out-quart",
            i < filled ? FILL_CLASS[severity] : "bg-border",
          )}
        />
      ))}
    </span>
  )
}
