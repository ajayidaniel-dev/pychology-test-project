import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Patients",
}
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { NewPatientDialog } from "@/components/patients/new-patient-dialog"
import { PatientListSection } from "@/components/patients/patient-list-section"
import {
  shapePatientList,
  PATIENT_QUESTIONNAIRES_INCLUDE,
  flattenQuestionnaires,
} from "@/lib/patient-summary"

export default async function PatientsPage() {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  const patients = await db.patient.findMany({
    where: { psychologistId: ctx.userId },
    include: PATIENT_QUESTIONNAIRES_INCLUDE,
    orderBy: { createdAt: "desc" },
  })

  const patientList = shapePatientList(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Patients"
        count={patients.length}
        description="Your caseload, most concerning current assessment first"
        hideTitleOnMobile
        actions={<NewPatientDialog />}
      />

      <PatientListSection
        patients={patientList}
        emptyAction={
          <NewPatientDialog
            trigger={<Button>Add first patient</Button>}
          />
        }
      />
    </div>
  )
}
