"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { AddQuestionnaireDialog } from "@/components/sessions/add-questionnaire-dialog"
import { SessionQuestionnairesTable } from "@/components/sessions/session-questionnaires-table"

export interface SessionQuestionnaireRow {
  id: string
  order: number
  scaleName: string
  status: string
  score: number | null
  severity: string | null
}

interface SessionQuestionnairesSectionProps {
  patientId: string
  sessionId: string
  questionnaires: SessionQuestionnaireRow[]
  token: string
  linkExpired: boolean
  /** APPOINTMENT | DIRECT — only the copy differs. */
  kind?: string
}

export function SessionQuestionnairesSection({
  patientId,
  sessionId,
  questionnaires,
  token,
  linkExpired,
  kind = "APPOINTMENT",
}: SessionQuestionnairesSectionProps) {
  const isDirect = kind === "DIRECT"

  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <SectionHeader title="Questionnaires" />
        <AddQuestionnaireDialog patientId={patientId} sessionId={sessionId} />
      </CardHeader>

      {questionnaires.length === 0 ? (
        <CardContent className="p-4 md:p-6">
          <EmptyState
            plain
            title={
              isDirect
                ? "No questionnaires left in this send"
                : "No questionnaires in this session"
            }
            description={
              isDirect
                ? "Add one or more scales — they join the link already sent to the patient."
                : "Add one or more scales, then send the patient this session's single link."
            }
          />
        </CardContent>
      ) : (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <SessionQuestionnairesTable
            patientId={patientId}
            sessionId={sessionId}
            questionnaires={questionnaires}
            token={token}
            linkExpired={linkExpired}
          />
        </div>
      )}
    </Card>
  )
}
