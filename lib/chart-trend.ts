export type ChartTrend = "improving" | "stable" | "worsening"

export function computeChartTrend(
  data: { score: number }[],
): ChartTrend {
  if (data.length < 2) return "stable"
  const first = data.at(0)!.score
  const last = data.at(-1)!.score
  if (last > first) return "worsening"
  if (last < first) return "improving"
  return "stable"
}

export const TREND_LABELS: Record<ChartTrend, string> = {
  improving: "Improving",
  stable: "Stable",
  worsening: "Worsening",
}
