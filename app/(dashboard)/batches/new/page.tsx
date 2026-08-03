import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { NewBatchForm } from "@/components/batches/new-batch-form"
import {
  shapePatientList,
  PATIENT_QUESTIONNAIRES_INCLUDE,
  flattenQuestionnaires,
} from "@/lib/patient-summary"

export const metadata: Metadata = {
  title: "New batch",
}

export default async function NewBatchPage({
  searchParams,
}: {
  searchParams: { kind?: string }
}) {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  // Same shaping as the patients list, so severity and last-assessed match
  // what the clinician sees everywhere else.
  const [patients, scales] = await Promise.all([
    db.patient.findMany({
      where: { psychologistId: ctx.userId },
      include: PATIENT_QUESTIONNAIRES_INCLUDE,
      orderBy: { anonymousId: "asc" },
    }),
    db.scale.findMany({
      where: {
        OR: [{ isLibrary: true }, { psychologistId: ctx.userId }],
      },
      select: { id: true, name: true, description: true, isLibrary: true },
      orderBy: { name: "asc" },
    }),
  ])

  // /batches/new?kind=direct opens straight into the questionnaire-only mode;
  // the form still lets the clinician switch.
  const defaultKind =
    searchParams.kind?.toUpperCase() === "DIRECT" ? "DIRECT" : "APPOINTMENT"

  const patientList = shapePatientList(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={defaultKind === "DIRECT" ? "Send to several patients" : "New batch"}
        description="One questionnaire set, sent to several patients at once."
        hideTitleOnMobile
      />

      <div>
        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 px-2" asChild>
          <Link href="/batches">
            <ArrowLeft className="size-4" />
            Back to batches
          </Link>
        </Button>
      </div>

      <NewBatchForm
        patients={patientList}
        scales={scales}
        defaultKind={defaultKind}
      />
    </div>
  )
}
