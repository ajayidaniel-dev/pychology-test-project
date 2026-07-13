import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface ScoreSummaryCardProps {
  totalScore: number
  severity: SeverityLevel | null
  scaleName: string
}

export function ScoreSummaryCard({
  totalScore,
  severity,
  scaleName,
}: ScoreSummaryCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Score Summary</CardTitle>
        <CardDescription>{scaleName}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-4xl font-bold tracking-tight">{totalScore}</p>
            <p className="mt-1 text-xs text-muted-foreground">Total score</p>
          </div>
          {severity && severity !== "none" && (
            <SeverityBadge severity={severity} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
