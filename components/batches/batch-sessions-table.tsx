"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Button } from "@/components/ui/button"
import { CopyLinkButton } from "@/components/sessions/copy-link-button"
import { SendStatusBadge } from "@/components/sessions/status-badges"

export type BatchSessionStatus = "completed" | "pending" | "expired"

export interface BatchSessionRow {
  sessionId: string
  patientId: string
  anonymousId: string
  displayName: string | null
  token: string
  status: BatchSessionStatus
  completedCount: number
  questionnaireCount: number
}

export function BatchSessionsTable({ rows }: { rows: BatchSessionRow[] }) {
  const hrefFor = (row: BatchSessionRow) =>
    `/patients/${row.patientId}/sessions/${row.sessionId}`

  const columns: ColumnDef<BatchSessionRow>[] = [
    {
      accessorKey: "anonymousId",
      header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
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
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <SendStatusBadge status={row.original.status} />,
    },
    {
      id: "progress",
      accessorFn: (row) => row.completedCount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Answered" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.completedCount} of {row.original.questionnaireCount}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        // A live link is only meaningful while there is something left to
        // answer; once it's expired the batch-level renew is the way back.
        row.original.status === "pending" ? (
          <CopyLinkButton token={row.original.token} iconOnly />
        ) : null,
    },
  ]

  return (
    <TanStackDataTable
      columns={columns}
      data={rows}
      shell={false}
      getRowHref={hrefFor}
      enableSearch
      searchPlaceholder="Search by ID or name…"
      globalFilterFn={(row, filter) => {
        const query = filter.toLowerCase()
        return (
          row.anonymousId.toLowerCase().includes(query) ||
          (row.displayName?.toLowerCase().includes(query) ?? false)
        )
      }}
      pageSize={25}
      mobileListClassName="divide-y"
      renderMobileRow={(row) => (
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="font-semibold">{row.anonymousId}</span>
              {row.displayName && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {row.displayName}
                </p>
              )}
            </div>
            <SendStatusBadge status={row.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {row.completedCount} of {row.questionnaireCount} answered
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {row.status === "pending" && (
              <CopyLinkButton token={row.token} className="w-full border" />
            )}
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href={hrefFor(row)}>Open session</Link>
            </Button>
          </div>
        </div>
      )}
    />
  )
}
