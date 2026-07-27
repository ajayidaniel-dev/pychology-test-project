"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { PatientDirectSendsTable } from "@/components/patients/patient-direct-sends-table"
import type { SendStatus } from "@/components/sessions/status-badges"

export interface PatientDirectSendRow {
  id: string
  /** Derived from the scales it contains — nobody titles a direct send. */
  title: string
  sentAt: Date
  questionnaireCount: number
  completedCount: number
  status: SendStatus
  token: string
}

interface PatientDirectSendsSectionProps {
  patientId: string
  sends: PatientDirectSendRow[]
}

/**
 * Questionnaires issued without an appointment. Kept separate from the sessions
 * table on purpose: a session is a thing that happened with the clinician, a
 * send is a link that went out.
 */
export function PatientDirectSendsSection({
  patientId,
  sends,
}: PatientDirectSendsSectionProps) {
  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <SectionHeader
          title="Sent questionnaires"
          description="Issued directly to the patient, outside a session"
        />
      </CardHeader>

      {sends.length === 0 ? (
        <CardContent className="p-4 md:p-6">
          <EmptyState
            plain
            title="Nothing sent directly"
            description='Use "Send questionnaire" to issue scales without booking an appointment. The patient gets a private link.'
          />
        </CardContent>
      ) : (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <PatientDirectSendsTable patientId={patientId} sends={sends} />
        </div>
      )}
    </Card>
  )
}
