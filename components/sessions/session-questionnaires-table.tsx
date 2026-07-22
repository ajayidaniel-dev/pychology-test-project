"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { type ColumnDef } from "@tanstack/react-table"
import { ChevronRight, Trash2 } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Button } from "@/components/ui/button"
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { SeverityLevel } from "@/components/ui/severity-badge"
import { QuestionnaireStatusBadge } from "@/components/sessions/status-badges"
import { CopyLinkButton } from "@/components/sessions/copy-link-button"
import type { SessionQuestionnaireRow } from "@/components/sessions/session-questionnaires-section"

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

interface SessionQuestionnairesTableProps {
  patientId: string
  sessionId: string
  questionnaires: SessionQuestionnaireRow[]
  /** The session's fill token — the link is per session, shared by its rows. */
  token: string
  linkExpired: boolean
}

export function SessionQuestionnairesTable({
  patientId,
  sessionId,
  questionnaires,
  token,
  linkExpired,
}: SessionQuestionnairesTableProps) {
  const router = useRouter()

  // Only a completed questionnaire has a results page. Pending and expired ones
  // have no response row, so linking them would land on a 404.
  const hrefFor = (row: SessionQuestionnaireRow) =>
    row.status === "COMPLETED"
      ? `/patients/${patientId}/sessions/${sessionId}/questionnaires/${row.id}`
      : null

  async function onRemove(id: string) {
    const res = await fetch(
      `/api/patients/${patientId}/sessions/${sessionId}/questionnaires/${id}`,
      { method: "DELETE" },
    )
    if (!res.ok) {
      toast.error("Couldn't remove that questionnaire.")
      return
    }
    toast.success("Questionnaire removed")
    router.refresh()
  }

  const hasScores = questionnaires.some((q) => q.score != null)
  const hasSeverity = questionnaires.some((q) => severityToLevel(q.severity))

  const columns: ColumnDef<SessionQuestionnaireRow>[] = [
    {
      accessorKey: "order",
      header: ({ column }) => <DataTableColumnHeader column={column} title="#" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.order}</span>
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
      cell: ({ row }) => (
        <QuestionnaireStatusBadge status={row.original.status} />
      ),
    },
    ...(hasScores
      ? [
          {
            id: "score",
            accessorFn: (row: SessionQuestionnaireRow) => row.score ?? -1,
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Score" />
            ),
            cell: ({ row }) => row.original.score ?? "—",
          } satisfies ColumnDef<SessionQuestionnaireRow>,
        ]
      : []),
    ...(hasSeverity
      ? [
          {
            accessorKey: "severity",
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Severity" />
            ),
            cell: ({ row }) => {
              const level = severityToLevel(row.original.severity)
              return level ? <SeverityBadge severity={level} /> : "—"
            },
          } satisfies ColumnDef<SessionQuestionnaireRow>,
        ]
      : []),
    {
      id: "actions",
      enableSorting: false,
      meta: { className: "w-24" },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const questionnaire = row.original
        if (questionnaire.status === "COMPLETED") {
          return <ChevronRight className="size-4 text-muted-foreground" />
        }
        return (
          <div className="flex items-center justify-end gap-0.5">
            {/* Only a pending row is still fillable — an expired one needs the
                session link renewed before its link means anything. */}
            {questionnaire.status === "PENDING" && !linkExpired && (
              <CopyLinkButton token={token} iconOnly />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="relative z-20 size-8"
              aria-label={`Remove ${questionnaire.scaleName}`}
              onClick={(e) => {
                e.preventDefault()
                onRemove(questionnaire.id)
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <TanStackDataTable
      columns={columns}
      data={questionnaires}
      shell={false}
      isRowClickable={(row) => row.status === "COMPLETED"}
      getRowHref={hrefFor}
      mobileListClassName="divide-y"
      renderMobileRow={(questionnaire) => (
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium">{questionnaire.scaleName}</p>
            <QuestionnaireStatusBadge status={questionnaire.status} />
          </div>

          {questionnaire.score != null && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Score: {questionnaire.score}
              </span>
              {severityToLevel(questionnaire.severity) && (
                <SeverityBadge
                  severity={severityToLevel(questionnaire.severity)!}
                />
              )}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {questionnaire.status === "COMPLETED" ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={hrefFor(questionnaire)!}>View results</Link>
              </Button>
            ) : (
              <>
                {questionnaire.status === "PENDING" && !linkExpired && (
                  <CopyLinkButton token={token} className="w-full border" />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => onRemove(questionnaire.id)}
                >
                  <Trash2 className="size-4" />
                  Remove from session
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    />
  )
}
