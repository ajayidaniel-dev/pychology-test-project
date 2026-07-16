import prisma from "@/lib/prisma"
import { isTokenExpired } from "@/lib/token"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { FillFlow } from "@/components/questionnaire/fill-flow"
import { FillShell } from "@/components/questionnaire/fill-shell"
import { InvalidLinkCard } from "@/components/questionnaire/invalid-link-card"

export default async function FillPage({
  params,
}: {
  params: { token: string }
}) {
  const session = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
    include: {
      scale: {
        include: {
          items: {
            include: { options: { orderBy: { order: "asc" } } },
            orderBy: { order: "asc" },
          },
        },
      },
      patient: { select: { fullName: true, email: true } },
      psychologist: { select: { name: true } },
    },
  })

  if (
    !session ||
    session.status !== "PENDING" ||
    isTokenExpired(session.tokenExpiresAt)
  ) {
    return (
      <FillShell>
        <InvalidLinkCard />
      </FillShell>
    )
  }

  const scaleKey = scaleNameToEnum(session.scale.name)
  const clinicianName = session.psychologist.name ?? null
  const patientHasDetails = Boolean(
    session.patient.fullName && session.patient.email,
  )

  return (
    <FillShell clinicianName={clinicianName}>
      <FillFlow
        scale={scaleKey}
        scaleName={session.scale.name}
        token={params.token}
        description={session.scale.description}
        dbItems={session.scale.items}
        clinicianName={clinicianName}
        collectDetails={session.collectDetails && !patientHasDetails}
      />
    </FillShell>
  )
}
