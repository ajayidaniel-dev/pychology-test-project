"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { SeverityMeter } from "@/components/ui/severity-meter"
import { ScoreReadout } from "@/components/ui/score-readout"
import type { PatientListItem } from "@/lib/patient-summary"

const columns: ColumnDef<PatientListItem>[] = [
  {
    accessorKey: "anonymousId",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ID" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.anonymousId}</span>
    ),
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.displayName ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "sessionCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sessions" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-normal">
        {row.original.sessionCount}
      </Badge>
    ),
  },
  {
    id: "severity",
    accessorFn: (row) => row.severity ?? "",
    meta: { className: "w-24" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Severity" />
    ),
    cell: ({ row }) => <SeverityMeter severity={row.original.severity} />,
  },
  {
    id: "score",
    accessorFn: (row) => row.latestScore ?? -1,
    meta: { className: "text-right" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last score" align="right" />
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
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Added" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    ),
    sortingFn: (a, b) =>
      new Date(a.original.createdAt).getTime() -
      new Date(b.original.createdAt).getTime(),
  },
]

interface PatientListTableProps {
  patients: PatientListItem[]
}

export function PatientListTable({ patients }: PatientListTableProps) {
  const practiceHref = usePracticeHref()

  const hasNames = patients.some((p) => p.displayName)
  const hasScores = patients.some((p) => p.latestScore != null)
  const visibleColumns = columns.filter((column) => {
    if ("accessorKey" in column && column.accessorKey === "displayName") return hasNames
    if (column.id === "score") return hasScores
    return true
  })

  return (
    <TanStackDataTable
      columns={visibleColumns}
      data={patients}
      getRowHref={(row) => practiceHref(`/patients/${row.id}`)}
      enableSearch
      searchPlaceholder="Search by ID or name…"
      globalFilterFn={(row, filter) => {
        const query = filter.toLowerCase()
        return (
          row.anonymousId.toLowerCase().includes(query) ||
          (row.displayName?.toLowerCase().includes(query) ?? false)
        )
      }}
      mobileListClassName="divide-y"
      renderMobileRow={(row) => (
        <Link
          href={practiceHref(`/patients/${row.id}`)}
          className="block min-h-18 px-4 py-3 transition-colors hover:bg-accent/50 active:bg-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold">{row.anonymousId}</span>
              {row.displayName && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {row.displayName}
                </p>
              )}
            </div>
            {row.severity && row.severity !== "none" && (
              <SeverityBadge severity={row.severity} />
            )}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {row.latestScaleName ?? "No scale"} · Score {row.latestScore ?? "—"}
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {row.sessionCount} session{row.sessionCount !== 1 ? "s" : ""}
            </span>
            <span>{new Date(row.createdAt).toLocaleDateString()}</span>
          </div>
        </Link>
      )}
    />
  )
}
