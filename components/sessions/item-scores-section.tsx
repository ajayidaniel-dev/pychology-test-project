"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ItemScoresTable } from "@/components/sessions/item-scores-table"

export interface ItemScoreRow {
  key: string
  label: string
  score: number
  isSafetyItem?: boolean
}

interface ItemScoresSectionProps {
  items: ItemScoreRow[]
}

export function ItemScoresSection({ items }: ItemScoresSectionProps) {
  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <CardTitle className="text-base">Item Scores</CardTitle>
      </CardHeader>

      <div className="px-4 pb-4 md:px-6 md:pb-6">
        <ItemScoresTable items={items} />
      </div>
    </Card>
  )
}
