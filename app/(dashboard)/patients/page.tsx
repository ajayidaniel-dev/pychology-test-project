import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Patients",
}
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
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
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
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
