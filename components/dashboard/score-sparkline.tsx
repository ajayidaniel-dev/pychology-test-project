const WIDTH = 72
const HEIGHT = 20
const PAD = 3
const MAX_POINTS = 8

/**
 * Per-row score trend: same-scale totals, oldest → newest. Neutral ink only —
 * the severity badge beside it carries risk color (Severity Monopoly Rule).
 */
export function ScoreSparkline({
  scores,
  scaleName,
}: {
  scores: number[]
  scaleName: string | null
}) {
  const points = scores.slice(-MAX_POINTS)
  if (points.length < 2) {
    return <span className="text-muted-foreground">—</span>
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = (WIDTH - PAD * 2) / (points.length - 1)
  const coords = points.map((score, i) => ({
    x: PAD + i * stepX,
    y: PAD + (HEIGHT - PAD * 2) * (1 - (score - min) / span),
  }))
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ")
  const last = coords[coords.length - 1]

  const label = `Score trend${scaleName ? ` on ${scaleName}` : ""}: ${points.join(", ")}`

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <path
        d={path}
        fill="none"
        className="stroke-muted-foreground"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current score: ink dot with a surface ring so it reads over the line */}
      <circle
        cx={last.x}
        cy={last.y}
        r="3.5"
        className="fill-card stroke-card"
        strokeWidth="2"
      />
      <circle cx={last.x} cy={last.y} r="2.5" className="fill-foreground" />
    </svg>
  )
}
