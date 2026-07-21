import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const AddQuestionnaireSchema = z.object({
  scaleId: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const clinicalSession = await prisma.clinicalSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    select: { id: true, _count: { select: { questionnaires: true } } },
  })
  if (!clinicalSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = AddQuestionnaireSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const scaleRecord = await prisma.scale.findFirst({
    where: {
      id: parsed.data.scaleId,
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    select: { id: true },
  })
  if (!scaleRecord) return NextResponse.json({ error: 'Scale not found' }, { status: 400 })

  const questionnaire = await prisma.questionnaire.create({
    data: {
      sessionId: params.sessionId,
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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const questionnaires = await prisma.questionnaire.findMany({
    where: {
      sessionId: params.sessionId,
      session: { patientId: params.id, psychologistId: session.user.id },
    },
    include: { response: true, scale: { select: { id: true, name: true } } },
    orderBy: { order: 'asc' },
  })

  return NextResponse.json(questionnaires)
}
