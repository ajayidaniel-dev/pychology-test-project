import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export interface DraftThreshold {
  label: string
  minScore: string
  maxScore: string
}

interface ThresholdsStepProps {
  thresholds: DraftThreshold[]
  onAddRow: () => void
  onRemoveRow: (i: number) => void
  onUpdate: (i: number, field: keyof DraftThreshold, val: string) => void
}

export function ThresholdsStep({
  thresholds,
  onAddRow,
  onRemoveRow,
  onUpdate,
}: ThresholdsStepProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Score Thresholds</CardTitle>
        <CardDescription>
          Optional severity labels for score ranges.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden grid-cols-[1fr_80px_80px_auto] gap-2 px-1 text-xs font-medium text-muted-foreground md:grid">
          <span>Label</span>
          <span>Min</span>
          <span>Max</span>
          <span className="w-8" />
        </div>

        <div className="space-y-3">
          {thresholds.map((th, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-3 md:grid md:grid-cols-[1fr_80px_80px_auto] md:items-center md:gap-2 md:border-0 md:p-0"
            >
              <div className="space-y-2 md:contents">
                <div className="space-y-1 md:space-y-0">
                  <Label className="md:sr-only">Label</Label>
                  <Input
                    placeholder="e.g. Mild"
                    value={th.label}
                    onChange={(e) => onUpdate(i, "label", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 md:contents">
                  <div className="space-y-1 md:space-y-0">
                    <Label className="md:sr-only">Min score</Label>
                    <Input
                      placeholder="0"
                      type="number"
                      value={th.minScore}
                      onChange={(e) => onUpdate(i, "minScore", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 md:space-y-0">
                    <Label className="md:sr-only">Max score</Label>
                    <Input
                      placeholder="10"
                      type="number"
                      value={th.maxScore}
                      onChange={(e) => onUpdate(i, "maxScore", e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {thresholds.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mt-2 size-8 text-muted-foreground hover:text-destructive md:mt-0"
                  onClick={() => onRemoveRow(i)}
                  aria-label="Remove threshold"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="link"
          className="h-auto p-0"
          onClick={onAddRow}
        >
          + Add threshold
        </Button>
      </CardContent>
    </Card>
  )
}
