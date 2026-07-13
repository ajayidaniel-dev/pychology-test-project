import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { resolveUnreviewedForSession } from '@/lib/notifications'
import { z } from 'zod'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    include: { response: true, patient: true },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(assessmentSession)
}

const PatchResponseSchema = z.object({
  action: z.enum(['reviewed', 'escalated']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    include: { response: true },
  })

  if (!assessmentSession?.response) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const parsed = PatchResponseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const now = new Date()
  const data =
    parsed.data.action === 'reviewed'
      ? { reviewedAt: now }
      : { escalatedAt: now }

  const updated = await prisma.questionnaireResponse.update({
    where: { sessionId: params.sessionId },
    data,
  })

  if (parsed.data.action === 'reviewed') {
    await resolveUnreviewedForSession(params.sessionId)
  }

  return NextResponse.json(updated)
}
