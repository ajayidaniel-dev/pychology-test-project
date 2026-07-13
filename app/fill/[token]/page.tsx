import prisma from "@/lib/prisma"
import { isTokenExpired } from "@/lib/token"
import { scaleNameToEnum } from "@/lib/patient-summary"
import { QuestionnaireForm } from "@/components/questionnaire/questionnaire-form"
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
    },
  })

  if (
    !session ||
    session.status !== "PENDING" ||
    isTokenExpired(session.tokenExpiresAt)
  ) {
    return <InvalidLinkCard />
  }

  const scaleKey = scaleNameToEnum(session.scale.name)

  return (
    <QuestionnaireForm
      scale={scaleKey}
      scaleName={session.scale.name}
      token={params.token}
      description={session.scale.description}
      dbItems={session.scale.items}
    />
  )
}
