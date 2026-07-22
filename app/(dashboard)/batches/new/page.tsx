import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
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

export default async function NewBatchPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  // Same shaping as the patients list, so severity and last-assessed match
  // what the clinician sees everywhere else.
  const [patients, scales] = await Promise.all([
    prisma.patient.findMany({
      where: { psychologistId: session.user.id },
      include: PATIENT_QUESTIONNAIRES_INCLUDE,
      orderBy: { anonymousId: "asc" },
    }),
    prisma.scale.findMany({
      where: {
        OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
      },
      select: { id: true, name: true, description: true, isLibrary: true },
      orderBy: { name: "asc" },
    }),
  ])

  const patientList = shapePatientList(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="New batch"
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

      <NewBatchForm patients={patientList} scales={scales} />
    </div>
  )
}
