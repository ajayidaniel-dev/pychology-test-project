import { cn } from "@/lib/utils"

interface ScoreReadoutProps {
  score: number | null
  /** Maximum possible score for the instrument; null for custom scales. */
  maxScore?: number | null
  /**
   * Lowest score of the band this result falls in. Rendered as context beneath
   * the figure so a reader knows what the number means without recalling the
   * instrument's cutoffs.
   */
  threshold?: number | null
  className?: string
}

/**
 * A score as a clinician reads it: the figure, what it is out of, and the
 * threshold it cleared.
 *
 * A bare "14" is the single biggest reason the caseload read as an admin list
 * rather than an instrument — 14 is unremarkable on the BDI-II and clinically
 * significant on the GAD-7, and the table gave no way to tell. Denominator and
 * threshold are omitted rather than guessed when the scale is custom and its
 * metadata is unknown.
 */
export function ScoreReadout({
  score,
  maxScore,
  threshold,
  className,
}: ScoreReadoutProps) {
  if (score === null) {
    return <span className={cn("text-muted-foreground", className)}>—</span>
  }

  return (
    <span className={cn("flex flex-col items-end leading-tight", className)}>
      <span className="font-mono text-sm tabular-nums">
        {score}
        {typeof maxScore === "number" && (
          <span className="text-muted-foreground">/{maxScore}</span>
        )}
      </span>
      {typeof threshold === "number" && (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          cutoff {threshold}
        </span>
      )}
    </span>
  )
}
