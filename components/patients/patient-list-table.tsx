"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { SeverityBadge } from "@/components/ui/severity-badge"
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
    id: "score",
    accessorFn: (row) => row.latestScore ?? -1,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last Score" />
    ),
    cell: ({ row }) => (
      <span className="flex items-center gap-2">
        {row.original.latestScore ?? "—"}
        {row.original.severity && row.original.severity !== "none" && (
          <SeverityBadge severity={row.original.severity} />
        )}
      </span>
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
  return (
    <TanStackDataTable
      columns={columns}
      data={patients}
      getRowHref={(row) => `/patients/${row.id}`}
      enableSearch
      searchPlaceholder="Search by ID or name…"
      globalFilterFn={(row, filter) => {
        const query = filter.toLowerCase()
        return (
          row.anonymousId.toLowerCase().includes(query) ||
          (row.displayName?.toLowerCase().includes(query) ?? false)
        )
      }}
      renderMobileRow={(row) => (
        <Link
          href={`/patients/${row.id}`}
          className="block min-h-[72px] rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 active:bg-accent"
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
