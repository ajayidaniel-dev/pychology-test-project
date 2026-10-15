"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Button } from "@/components/ui/button"
import { CopyLinkButton } from "@/components/sessions/copy-link-button"
import { SessionStatusBadge } from "@/components/sessions/status-badges"
import type { PatientSessionRow } from "@/components/patients/patient-sessions-section"

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** "2 of 3 completed" — the honest state of a session's questionnaires. */
function progressLabel(row: PatientSessionRow): string {
  if (row.questionnaireCount === 0) return "No questionnaires"
  return `${row.completedCount} of ${row.questionnaireCount} completed`
}

function buildColumns(): ColumnDef<PatientSessionRow>[] {
  return [
    {
      accessorKey: "scheduledAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Date" />
      ),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDate(row.original.scheduledAt)}
        </span>
      ),
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Session" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.title}</p>
          {row.original.scaleNames.length > 0 && (
            <p className="truncate text-xs text-muted-foreground">
              {row.original.scaleNames.join(", ")}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "progress",
      accessorFn: (row) => row.completedCount,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Questionnaires" />
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
      cell: ({ row }) => <SessionStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const session = row.original
        // The link is only worth copying while someone can still fill it.
        const canShare =
          session.completedCount < session.questionnaireCount &&
          !session.linkExpired &&
          session.status !== "CANCELLED"
        return canShare ? (
          <CopyLinkButton token={session.token} iconOnly />
        ) : (
          <ChevronRight className="size-4 text-muted-foreground" />
        )
      },
    },
  ]
}

interface PatientSessionsTableProps {
  patientId: string
  sessions: PatientSessionRow[]
}

export function PatientSessionsTable({
  patientId,
  sessions,
}: PatientSessionsTableProps) {
  const practiceHref = usePracticeHref()

  return (
    <TanStackDataTable
      columns={buildColumns()}
      data={sessions}
      shell={false}
      isRowClickable={() => true}
      getRowHref={(row) => practiceHref(`/patients/${patientId}/sessions/${row.id}`)}
      mobileListClassName="divide-y"
      renderMobileRow={(session) => (
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{session.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(session.scheduledAt)} · {progressLabel(session)}
              </p>
            </div>
            <SessionStatusBadge status={session.status} />
          </div>

          {session.scaleNames.length > 0 && (
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {session.scaleNames.join(", ")}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={practiceHref(`/patients/${patientId}/sessions/${session.id}`)}>
                Open session
              </Link>
            </Button>
            {session.completedCount < session.questionnaireCount &&
              !session.linkExpired &&
              session.status !== "CANCELLED" && (
                <CopyLinkButton token={session.token} />
              )}
          </div>
        </div>
      )}
    />
  )
}
