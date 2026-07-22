"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { SeverityLevel } from "@/components/ui/severity-badge"
import {
  NOT_ASSESSED_IN_DAY_OPTIONS,
  type BatchCriteria,
} from "@/lib/batch-filters"
import { cn } from "@/lib/utils"

const SEVERITIES: SeverityLevel[] = ["critical", "high", "moderate", "low"]

const ANY_RECENCY = "any"

interface BatchCriteriaBarProps {
  criteria: BatchCriteria
  onChange: (criteria: BatchCriteria) => void
  matchCount: number
  totalCount: number
}

/**
 * Narrows which patients are offered, nothing more — the checkboxes in the
 * table are what actually commit anyone to the batch.
 */
export function BatchCriteriaBar({
  criteria,
  onChange,
  matchCount,
  totalCount,
}: BatchCriteriaBarProps) {
  const selectedSeverities = criteria.severity ?? []
  const hasCriteria =
    selectedSeverities.length > 0 || criteria.notAssessedInDays != null

  function toggleSeverity(level: SeverityLevel) {
    const next = selectedSeverities.includes(level)
      ? selectedSeverities.filter((s) => s !== level)
      : [...selectedSeverities, level]
    onChange({ ...criteria, severity: next })
  }

  return (
    <div className="flex flex-col gap-4 border-b px-4 py-4 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Current severity
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITIES.map((level) => {
              const active = selectedSeverities.includes(level)
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleSeverity(level)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    !active && "opacity-40 hover:opacity-70",
                  )}
                >
                  <SeverityBadge severity={level} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="batch-recency"
            className="text-xs text-muted-foreground"
          >
            Not assessed in
          </Label>
          <Select
            value={
              criteria.notAssessedInDays
                ? String(criteria.notAssessedInDays)
                : ANY_RECENCY
            }
            onValueChange={(value) =>
              onChange({
                ...criteria,
                notAssessedInDays:
                  value === ANY_RECENCY ? undefined : Number(value),
              })
            }
          >
            <SelectTrigger id="batch-recency" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_RECENCY}>Any time</SelectItem>
              {NOT_ASSESSED_IN_DAY_OPTIONS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {days} days or more
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {hasCriteria
            ? `${matchCount} of ${totalCount} patients match`
            : `${totalCount} patient${totalCount === 1 ? "" : "s"}`}
        </p>
        {hasCriteria && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => onChange({})}
          >
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
