import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { resolveUnreviewedForQuestionnaire } from '@/lib/notifications'
import { z } from 'zod'

type RouteParams = { params: { id: string; sessionId: string; questionnaireId: string } }

/** Scopes every lookup to the signed-in psychologist via the parent session. */
function ownedQuestionnaireWhere(params: RouteParams['params'], userId: string) {
  return {
    id: params.questionnaireId,
    sessionId: params.sessionId,
    session: { patientId: params.id, psychologistId: userId },
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questionnaire = await prisma.questionnaire.findFirst({
    where: ownedQuestionnaireWhere(params, session.user.id),
    include: {
      response: true,
      scale: true,
      session: { include: { patient: true } },
    },
  })

  if (!questionnaire) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(questionnaire)
}

const PatchQuestionnaireSchema = z.object({
  action: z.enum(['reviewed']),
})

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questionnaire = await prisma.questionnaire.findFirst({
    where: ownedQuestionnaireWhere(params, session.user.id),
    include: { response: true },
  })

  if (!questionnaire?.response) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = PatchQuestionnaireSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.questionnaireResponse.update({
    where: { questionnaireId: params.questionnaireId },
    data: { reviewedAt: new Date() },
  })

  await resolveUnreviewedForQuestionnaire(params.questionnaireId)

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questionnaire = await prisma.questionnaire.findFirst({
    where: ownedQuestionnaireWhere(params, session.user.id),
    select: { id: true, status: true },
  })
  if (!questionnaire) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A completed questionnaire is clinical record, not a draft — removing it
  // would silently drop a scored response the summary and chart depend on.
  if (questionnaire.status === 'COMPLETED') {
    return NextResponse.json(
      { error: 'Completed questionnaires cannot be removed' },
      { status: 409 },
    )
  }

  await prisma.questionnaire.delete({ where: { id: params.questionnaireId } })

  return NextResponse.json({ ok: true })
}
