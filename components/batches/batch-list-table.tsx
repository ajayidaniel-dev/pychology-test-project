"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"

export interface BatchListItem {
  id: string
  title: string
  /** APPOINTMENT | DIRECT — a direct batch booked nothing, it only sent links. */
  kind: string
  scheduledAt: Date
  patientCount: number
  completedCount: number
  expiredLinkCount: number
}

function ProgressLabel({ done, total }: { done: number; total: number }) {
  return (
    <span className={done === total && total > 0 ? "font-medium" : undefined}>
      {done} of {total}
    </span>
  )
}

const columns: ColumnDef<BatchListItem>[] = [
  {
    accessorKey: "title",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Batch" />
    ),
    cell: ({ row }) => (
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">{row.original.title}</span>
        {row.original.kind === "DIRECT" && (
          <Badge variant="secondary" className="shrink-0 font-normal">
            Direct
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "scheduledAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.scheduledAt).toLocaleDateString()}
      </span>
    ),
    sortingFn: (a, b) =>
      new Date(a.original.scheduledAt).getTime() -
      new Date(b.original.scheduledAt).getTime(),
  },
  {
    accessorKey: "patientCount",
    meta: { className: "text-right" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Patients" align="right" />
    ),
    // Was a Badge pill. A count is a figure, not a status — pills here competed
    // with the severity vocabulary and broke the numeric column edge.
    cell: ({ row }) => (
      <span className="block text-right font-mono text-sm tabular-nums text-muted-foreground">
        {row.original.patientCount}
      </span>
    ),
  },
  {
    id: "completed",
    accessorFn: (row) => row.completedCount,
    meta: { className: "text-right" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completed" align="right" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <ProgressLabel
          done={row.original.completedCount}
          total={row.original.patientCount}
        />
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    ),
  },
]

export function BatchListTable({ batches }: { batches: BatchListItem[] }) {
  const practiceHref = usePracticeHref()

  return (
    <TanStackDataTable
      columns={columns}
      data={batches}
      getRowHref={(row) => practiceHref(`/batches/${row.id}`)}
      mobileListClassName="divide-y"
      renderMobileRow={(row) => (
        <Link
          href={practiceHref(`/batches/${row.id}`)}
          className="block min-h-18 px-4 py-3 transition-colors hover:bg-accent/50 active:bg-accent"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 font-semibold">
              {row.title}
              {row.kind === "DIRECT" && (
                <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
                  Direct
                </span>
              )}
            </p>
            <Badge variant="secondary" className="font-normal">
              {row.patientCount}
            </Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              <ProgressLabel done={row.completedCount} total={row.patientCount} />{" "}
              completed
            </span>
            <span>{new Date(row.scheduledAt).toLocaleDateString()}</span>
          </div>
        </Link>
      )}
    />
  )
}
