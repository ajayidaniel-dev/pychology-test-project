"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { PatientSessionsTable } from "@/components/patients/patient-sessions-table"

export interface PatientSessionRow {
  id: string
  title: string
  reason: string | null
  scheduledAt: Date
  status: string
  questionnaireCount: number
  completedCount: number
  /** Scale names attached to the session, for the secondary line. */
  scaleNames: string[]
  token: string
  linkExpired: boolean
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
            plain
            title="No sessions yet"
            description='Click "New Session" to book an appointment. You can attach questionnaires to it afterwards.'
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
