"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { formatDistanceToNowStrict } from "date-fns"
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { SeverityMeter } from "@/components/ui/severity-meter"
import { ScoreReadout } from "@/components/ui/score-readout"
import { ScoreSparkline } from "@/components/dashboard/score-sparkline"
import type { CaseloadPatient } from "@/components/dashboard/caseload-section"

/** Signed same-scale change; neutral ink — severity carries the risk colour. */
function DeltaCell({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="block text-right text-muted-foreground">—</span>
  }
  if (delta === 0) {
    return (
      <span className="block text-right font-mono text-sm tabular-nums text-muted-foreground">
        ±0
      </span>
    )
  }
  const Arrow = delta > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className="flex items-center justify-end gap-1 font-mono text-sm tabular-nums">
      <Arrow aria-hidden className="size-3.5 text-muted-foreground" />
      {delta > 0 ? `+${delta}` : delta}
      <span className="sr-only">
        {delta > 0 ? "increase" : "decrease"} since previous assessment
      </span>
    </span>
  )
}

function LastAssessed({ date }: { date: Date | null }) {
  if (!date) return <span className="text-muted-foreground">—</span>
  return (
    <time
      dateTime={date.toISOString()}
      className="whitespace-nowrap text-sm text-muted-foreground"
    >
      {formatDistanceToNowStrict(date, { addSuffix: true })}
    </time>
  )
}

const columns: ColumnDef<CaseloadPatient>[] = [
  {
    accessorKey: "anonymousId",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => (
      <span className="font-mono text-sm font-medium tabular-nums">
        {row.original.anonymousId}
      </span>
    ),
  },
  {
    // Severity gets its own column rather than riding inside Score. Scanning
    // thirty rows for "who needs me" should be one vertical sweep, not thirty
    // separate reads.
    id: "severity",
    accessorFn: (row) => row.severity ?? "",
    meta: { className: "w-24" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Severity" />
    ),
    cell: ({ row }) => <SeverityMeter severity={row.original.severity} />,
  },
  {
    accessorKey: "latestScaleName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Scale" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.latestScaleName ?? "—"}
      </span>
    ),
  },
  {
    id: "score",
    accessorFn: (row) => row.latestScore ?? -1,
    meta: { className: "text-right" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Score" align="right" />
    ),
    cell: ({ row }) => (
      <ScoreReadout
        score={row.original.latestScore}
        maxScore={row.original.latestMaxScore}
        threshold={row.original.latestThreshold}
      />
    ),
  },
  {
    id: "delta",
    accessorFn: (row) => row.delta ?? 0,
    meta: { className: "hidden text-right lg:table-cell" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Δ" align="right" />
    ),
    cell: ({ row }) => <DeltaCell delta={row.original.delta} />,
  },
  {
    id: "trend",
    enableSorting: false,
    meta: { className: "hidden xl:table-cell" },
    header: () => <span className="text-xs font-medium tracking-wide uppercase">Trend</span>,
    cell: ({ row }) => (
      <ScoreSparkline
        scores={row.original.scoreHistory}
        scaleName={row.original.latestScaleName}
      />
    ),
  },
  {
    id: "lastAssessedAt",
    accessorFn: (row) => row.lastAssessedAt?.getTime() ?? 0,
    meta: { className: "hidden lg:table-cell" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last assessed" />
    ),
    cell: ({ row }) => <LastAssessed date={row.original.lastAssessedAt} />,
  },
  {
    accessorKey: "sessionCount",
    meta: { className: "text-right" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sessions" align="right" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.original.sessionCount}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    ),
  },
]

export function CaseloadTable({ patients }: { patients: CaseloadPatient[] }) {
  const practiceHref = usePracticeHref()

  const hasScales = patients.some((p) => p.latestScaleName != null)
  const hasScores = patients.some((p) => p.latestScore != null)
  const hasHistory = patients.some((p) => p.scoreHistory.length >= 2)
  const visibleColumns = columns.filter((column) => {
    if ("accessorKey" in column && column.accessorKey === "latestScaleName")
      return hasScales
    if (column.id === "score" || column.id === "severity") return hasScores
    if (column.id === "delta" || column.id === "trend") return hasHistory
    if (column.id === "lastAssessedAt") return hasScores
    return true
  })

  return (
    <TanStackDataTable
      columns={visibleColumns}
      data={patients}
      getRowHref={(row) => practiceHref(`/patients/${row.id}`)}
      shell={false}
      // A critical row should not carry the same visual weight as a resolved
      // one. Weight comes from ink, not from a colour wash — a tinted row would
      // spend the severity palette on a whole surface.
      getRowClassName={(row) =>
        row.severity === "critical" ? "font-medium" : undefined
      }
      mobileListClassName="divide-y"
      renderMobileRow={(row) => (
        <Link
          href={practiceHref(`/patients/${row.id}`)}
          className="block min-h-18 px-4 py-3 transition-colors duration-150 ease-out-quart hover:bg-accent/50 active:bg-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2">
              <SeverityMeter severity={row.severity} />
              <span className="font-mono font-semibold tabular-nums">
                {row.anonymousId}
              </span>
            </span>
            {row.severity && <SeverityBadge severity={row.severity} />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {row.latestScaleName ?? "No scale"}
            <span className="font-mono tabular-nums text-foreground">
              {row.latestScore ?? "—"}
              {row.latestMaxScore !== null && `/${row.latestMaxScore}`}
            </span>
            {row.delta !== null && (
              <span className="font-mono tabular-nums">
                ({row.delta > 0 ? `+${row.delta}` : row.delta === 0 ? "±0" : row.delta})
              </span>
            )}
            {row.scoreHistory.length >= 2 && (
              <ScoreSparkline
                scores={row.scoreHistory}
                scaleName={row.latestScaleName}
              />
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.sessionCount} session{row.sessionCount !== 1 ? "s" : ""}
            {row.lastAssessedAt && (
              <>
                {" · last assessed "}
                {formatDistanceToNowStrict(row.lastAssessedAt, { addSuffix: true })}
              </>
            )}
          </p>
        </Link>
      )}
    />
  )
}
