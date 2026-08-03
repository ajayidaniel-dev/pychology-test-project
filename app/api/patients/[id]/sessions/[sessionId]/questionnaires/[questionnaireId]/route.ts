import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
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
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const questionnaire = await db.questionnaire.findFirst({
    where: ownedQuestionnaireWhere(params, ctx.userId),
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
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const questionnaire = await db.questionnaire.findFirst({
    where: ownedQuestionnaireWhere(params, ctx.userId),
    include: { response: true },
  })

  if (!questionnaire?.response) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = PatchQuestionnaireSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await db.questionnaireResponse.update({
    where: { questionnaireId: params.questionnaireId },
    data: { reviewedAt: new Date() },
  })

  await resolveUnreviewedForQuestionnaire(params.questionnaireId)

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const questionnaire = await db.questionnaire.findFirst({
    where: ownedQuestionnaireWhere(params, ctx.userId),
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

  await db.questionnaire.delete({ where: { id: params.questionnaireId } })

  return NextResponse.json({ ok: true })
}
