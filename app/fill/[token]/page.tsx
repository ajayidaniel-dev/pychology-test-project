import { unscopedDb as prisma } from "@/lib/db"
import { isTokenExpired } from "@/lib/token"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { brandingTaglineFromSettings } from "@/lib/practice-slug"
import { FillFlow } from "@/components/questionnaire/fill-flow"
import type { PendingQuestionnaire } from "@/components/questionnaire/fill-flow"
import { FillShell } from "@/components/questionnaire/fill-shell"
import { InvalidLinkCard } from "@/components/questionnaire/invalid-link-card"

export default async function FillPage({
  params,
}: {
  params: { token: string }
}) {
  const clinicalSession = await prisma.clinicalSession.findUnique({
    where: { token: params.token },
    include: {
      questionnaires: {
        where: { status: "PENDING" },
        include: {
          scale: {
            include: {
              items: {
                include: { options: { orderBy: { order: "asc" } } },
                orderBy: { order: "asc" },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      },
      patient: { select: { fullName: true, email: true } },
      psychologist: { select: { name: true } },
      practice: { select: { name: true, settings: true } },
    },
  })

  // The link stays live while any questionnaire is still outstanding, so an
  // interrupted patient can reopen it and pick up where they left off.
  if (
    !clinicalSession ||
    clinicalSession.status === "CANCELLED" ||
    clinicalSession.questionnaires.length === 0 ||
    isTokenExpired(clinicalSession.tokenExpiresAt)
  ) {
    return (
      <FillShell>
        <InvalidLinkCard />
      </FillShell>
    )
  }

  const clinicianName = clinicalSession.psychologist.name ?? null
  const practiceName = clinicalSession.practice.name
  const tagline = brandingTaglineFromSettings(clinicalSession.practice.settings)
  const patientHasDetails = Boolean(
    clinicalSession.patient.fullName && clinicalSession.patient.email,
  )

  const questionnaires: PendingQuestionnaire[] = clinicalSession.questionnaires.map(
    (q) => ({
      id: q.id,
      scaleKey: scaleNameToEnum(q.scale.name),
      scaleName: q.scale.name,
      description: q.scale.description,
      items: q.scale.items,
    }),
  )

  return (
    <FillShell
      practiceName={practiceName}
      tagline={tagline}
      clinicianName={clinicianName}
    >
      <FillFlow
        token={params.token}
        sessionTitle={clinicalSession.title}
        questionnaires={questionnaires}
        practiceName={practiceName}
        clinicianName={clinicianName}
        collectDetails={clinicalSession.collectDetails && !patientHasDetails}
      />
    </FillShell>
  )
}
