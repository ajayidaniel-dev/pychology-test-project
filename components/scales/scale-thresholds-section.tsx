"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScaleThresholdsTable } from "@/components/scales/scale-thresholds-table"

interface Threshold {
  id: string
  label: string
  minScore: number
  maxScore: number
}

export function ScaleThresholdsSection({
  thresholds,
}: {
  thresholds: Threshold[]
}) {
  if (thresholds.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Score Interpretation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No custom thresholds defined.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <CardTitle className="text-base">Score Interpretation</CardTitle>
      </CardHeader>

      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <ScaleThresholdsTable thresholds={thresholds} />
      </div>
    </Card>
  )
}
