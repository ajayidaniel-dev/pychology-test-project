"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { CaseloadPatient } from "@/components/dashboard/caseload-section"

const columns: ColumnDef<CaseloadPatient>[] = [
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
    accessorKey: "latestScaleName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Scale" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.latestScaleName ?? "—"}
      </span>
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
    accessorKey: "sessionCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Sessions" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{row.original.sessionCount}</span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    ),
  },
]

export function CaseloadTable({ patients }: { patients: CaseloadPatient[] }) {
  return (
    <TanStackDataTable
      columns={columns}
      data={patients}
      getRowHref={(row) => `/patients/${row.id}`}
      shell={false}
      renderMobileRow={(row) => (
        <Link
          href={`/patients/${row.id}`}
          className="block min-h-[72px] rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 active:bg-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold">{row.anonymousId}</span>
            {row.severity && (
              <SeverityBadge severity={row.severity} />
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {row.latestScaleName ?? "No scale"} · Score {row.latestScore ?? "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {row.sessionCount} session{row.sessionCount !== 1 ? "s" : ""}
          </p>
        </Link>
      )}
    />
  )
}
