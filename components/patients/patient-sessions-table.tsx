"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SeverityBadge } from "@/components/ui/severity-badge"
import { CopyLinkButton } from "@/components/sessions/copy-link-button"
import type { SeverityLevel } from "@/components/ui/severity-badge"
import type { PatientSessionRow } from "@/components/patients/patient-sessions-section"

function StatusBadge({ status }: { status: string }) {
  if (status === "COMPLETED") {
    return (
      <Badge variant="outline" className="border-severity-low/40 text-severity-low">
        Completed
      </Badge>
    )
  }
  if (status === "PENDING") {
    return (
      <Badge variant="outline" className="border-severity-moderate/40 text-severity-moderate">
        Pending
      </Badge>
    )
  }
  return <Badge variant="secondary">{status}</Badge>
}

function severityToLevel(severity: string | null): SeverityLevel | null {
  if (
    severity === "critical" ||
    severity === "high" ||
    severity === "moderate" ||
    severity === "low"
  ) {
    return severity
  }
  return null
}

function buildColumns(patientId: string): ColumnDef<PatientSessionRow>[] {
  return [
    {
      accessorKey: "index",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="#" />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.index}</span>
      ),
    },
    {
      accessorKey: "scaleName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Scale" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.scaleName}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "score",
      accessorFn: (row) => row.score ?? -1,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Score" />
      ),
      cell: ({ row }) => row.original.score ?? "—",
    },
    {
      accessorKey: "severity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Severity" />
      ),
      cell: ({ row }) => {
        const level = severityToLevel(row.original.severity)
        return level ? <SeverityBadge severity={level} /> : "—"
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const session = row.original
        if (session.status === "COMPLETED") {
          return <ChevronRight className="size-4 text-muted-foreground" />
        }
        if (session.status === "PENDING") {
          return <CopyLinkButton token={session.token} />
        }
        return null
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
  return (
    <TanStackDataTable
      columns={buildColumns(patientId)}
      data={sessions}
      shell={false}
      isRowClickable={(row) => row.status === "COMPLETED"}
      getRowHref={(row) =>
        `/patients/${patientId}/sessions/${row.id}`
      }
      renderMobileRow={(session) => (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{session.scaleName}</p>
              <p className="text-xs text-muted-foreground">
                Session {session.index}
              </p>
            </div>
            <StatusBadge status={session.status} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Score: {session.score ?? "—"}
            </span>
            {session.severity && severityToLevel(session.severity) && (
              <SeverityBadge severity={severityToLevel(session.severity)!} />
            )}
          </div>
          <div className="mt-3">
            {session.status === "COMPLETED" ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/patients/${patientId}/sessions/${session.id}`}>
                  View AI Summary
                </Link>
              </Button>
            ) : session.status === "PENDING" ? (
              <CopyLinkButton token={session.token} />
            ) : null}
          </div>
        </div>
      )}
    />
  )
}
