"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"

interface ThresholdRow {
  id: string
  label: string
  minScore: number
  maxScore: number
}

const columns: ColumnDef<ThresholdRow>[] = [
  {
    accessorKey: "label",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Label" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.label}</span>
    ),
  },
  {
    accessorKey: "minScore",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Min score" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.minScore}</span>
    ),
  },
  {
    accessorKey: "maxScore",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Max score" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.maxScore}</span>
    ),
  },
]

export function ScaleThresholdsTable({
  thresholds,
}: {
  thresholds: ThresholdRow[]
}) {
  return (
    <TanStackDataTable
      columns={columns}
      data={thresholds}
      shell={false}
      enablePagination={false}
      isRowClickable={() => false}
      renderMobileRow={(threshold) => (
        <div className="rounded-lg border bg-card p-3">
          <p className="font-medium">{threshold.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Score range: {threshold.minScore} – {threshold.maxScore}
          </p>
        </div>
      )}
    />
  )
}
