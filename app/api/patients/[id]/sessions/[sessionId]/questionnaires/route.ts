import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'

const AddQuestionnaireSchema = z.object({
  scaleId: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const clinicalSession = await db.clinicalSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: ctx.userId,
    },
    select: { id: true, _count: { select: { questionnaires: true } } },
  })
  if (!clinicalSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = AddQuestionnaireSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const scaleRecord = await db.scale.findFirst({
    where: {
      id: parsed.data.scaleId,
      OR: [{ isLibrary: true }, { psychologistId: ctx.userId }],
    },
    select: { id: true },
  })
  if (!scaleRecord) return NextResponse.json({ error: 'Scale not found' }, { status: 400 })

  const questionnaire = await db.questionnaire.create({
    data: {
      sessionId: params.sessionId,
      practiceId: ctx.practiceId,
      scaleId: parsed.data.scaleId,
      order: clinicalSession._count.questionnaires + 1,
    },
    include: { scale: { select: { id: true, name: true } } },
  })

  return NextResponse.json(questionnaire, { status: 201 })
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const questionnaires = await db.questionnaire.findMany({
    where: {
      sessionId: params.sessionId,
      session: { patientId: params.id, psychologistId: ctx.userId },
    },
    include: { response: true, scale: { select: { id: true, name: true } } },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json(questionnaires)
}
