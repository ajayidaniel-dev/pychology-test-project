"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { PatientSessionsTable } from "@/components/patients/patient-sessions-table"

export interface PatientSessionRow {
  id: string
  index: number
  scaleName: string
  status: string
  score: number | null
  severity: string | null
  token: string
}

interface PatientSessionsSectionProps {
  patientId: string
  sessions: PatientSessionRow[]
}

export function PatientSessionsSection({
  patientId,
  sessions,
}: PatientSessionsSectionProps) {
  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <SectionHeader title="Sessions" />
      </CardHeader>

      {sessions.length === 0 ? (
        <CardContent className="p-4 md:p-6">
          <EmptyState
            title="No sessions yet"
            description='Click "New Session" to create an assessment and send a questionnaire link.'
          />
        </CardContent>
      ) : (
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <PatientSessionsTable patientId={patientId} sessions={sessions} />
        </div>
      )}
    </Card>
  )
}
