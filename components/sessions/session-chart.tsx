"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts"
import { computeChartTrend } from "@/lib/chart-trend"

interface Props {
  scale: string
  data: { session: number; score: number }[]
}

const SEVERITY_LINES: Record<
  string,
  { label: string; y: number; color: string }[]
> = {
  PHQ9: [
    { label: "Moderate", y: 10, color: "var(--severity-moderate)" },
    { label: "High", y: 15, color: "var(--severity-high)" },
    { label: "Critical", y: 20, color: "var(--severity-critical)" },
  ],
  BDI2: [
    { label: "Moderate", y: 14, color: "var(--severity-moderate)" },
    { label: "High", y: 20, color: "var(--severity-high)" },
    { label: "Critical", y: 29, color: "var(--severity-critical)" },
  ],
  GAD7: [
    { label: "Moderate", y: 5, color: "var(--severity-moderate)" },
    { label: "High", y: 10, color: "var(--severity-high)" },
    { label: "Critical", y: 15, color: "var(--severity-critical)" },
  ],
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { value: number }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      Score: <span className="font-semibold">{payload[0].value}</span>
    </div>
  )
}

export function ChartLegend({ scale }: { scale: string }) {
  const lines = SEVERITY_LINES[scale] ?? []
  if (lines.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
      {lines.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4 border-t-2 border-dashed"
            style={{ borderColor: color }}
          />
          {label}
        </span>
      ))}
    </div>
  )
}

export function SessionChart({ scale, data }: Props) {
  const lines = SEVERITY_LINES[scale] ?? []
  const trend = computeChartTrend(data)

  const lineColor =
    trend === "worsening"
      ? "var(--severity-critical)"
      : trend === "improving"
        ? "var(--severity-low)"
        : "var(--chart-1)"

  if (data.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        No score data to display yet.
      </p>
    )
  }

  /*
   * A single point is not a trend, so don't pretend to plot one — show the
   * score as a figure and say plainly what's missing. Left-aligned to the
   * card: centring inside a max-w container left the text visibly off-centre
   * against the full-width card.
   */
  if (data.length === 1) {
    return (
      <div className="flex items-baseline gap-3 py-2">
        <span className="text-3xl font-semibold tracking-tight">
          {data[0].score}
        </span>
        <span className="text-sm text-muted-foreground">
          One session recorded — a second is needed before a trend can be shown.
        </span>
      </div>
    )
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="session"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: number) => `Session ${v}`}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<ChartTooltip />} />
          {lines.map(({ label, y, color }) => (
            <ReferenceLine
              key={label}
              y={y}
              stroke={color}
              strokeDasharray="4 4"
              label={{ value: label, fontSize: 11, fill: color }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="score"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <ChartLegend scale={scale} />
    </div>
  )
}
