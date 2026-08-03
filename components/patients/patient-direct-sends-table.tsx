"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Button } from "@/components/ui/button"
import { CopyLinkButton } from "@/components/sessions/copy-link-button"
import { SendStatusBadge } from "@/components/sessions/status-badges"
import type { PatientDirectSendRow } from "@/components/patients/patient-direct-sends-section"

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function progressLabel(row: PatientDirectSendRow): string {
  if (row.questionnaireCount === 0) return "No questionnaires"
  return `${row.completedCount} of ${row.questionnaireCount} completed`
}

/** Only worth copying while the patient can still open it. */
function canShare(row: PatientDirectSendRow): boolean {
  return row.status === "pending"
}

function buildColumns(): ColumnDef<PatientDirectSendRow>[] {
  return [
    {
      accessorKey: "sentAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sent" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.sentAt)}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Questionnaires" />
      ),
      cell: ({ row }) => (
        <p className="min-w-0 truncate font-medium">{row.original.title}</p>
      ),
    },
    {
      id: "progress",
      accessorFn: (row) => row.completedCount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Progress" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {progressLabel(row.original)}
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
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) =>
        canShare(row.original) ? (
          <CopyLinkButton token={row.original.token} iconOnly />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        ),
    },
  ]
}

interface PatientDirectSendsTableProps {
  patientId: string
  sends: PatientDirectSendRow[]
}

export function PatientDirectSendsTable({
  patientId,
  sends,
}: PatientDirectSendsTableProps) {
  const practiceHref = usePracticeHref()

  return (
    <TanStackDataTable
      columns={buildColumns()}
      data={sends}
      shell={false}
      isRowClickable={() => true}
      getRowHref={(row) => practiceHref(`/patients/${patientId}/sessions/${row.id}`)}
      mobileListClassName="divide-y"
      renderMobileRow={(send) => (
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{send.title}</p>
              <p className="text-xs text-muted-foreground">
                Sent {formatDate(send.sentAt)} · {progressLabel(send)}
              </p>
            </div>
            <SendStatusBadge status={send.status} />
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={practiceHref(`/patients/${patientId}/sessions/${send.id}`)}>
                Open
              </Link>
            </Button>
            {canShare(send) && <CopyLinkButton token={send.token} />}
          </div>
        </div>
      )}
    />
  )
}
