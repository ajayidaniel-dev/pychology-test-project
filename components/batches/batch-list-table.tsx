"use client"

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
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Patients" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="font-normal">
        {row.original.patientCount}
      </Badge>
    ),
  },
  {
    id: "completed",
    accessorFn: (row) => row.completedCount,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Completed" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-between gap-2">
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
  return (
    <TanStackDataTable
      columns={columns}
      data={batches}
      getRowHref={(row) => `/batches/${row.id}`}
      mobileListClassName="divide-y"
      renderMobileRow={(row) => (
        <Link
          href={`/batches/${row.id}`}
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
