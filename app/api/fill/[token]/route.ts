import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isTokenExpired } from '@/lib/token'
import { Prisma } from '@prisma/client'
import { computeNumericScore, lookupSeverity, validateItemScores } from '@/lib/scale-scoring'
import { createSessionSubmitNotifications } from '@/lib/notifications'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const assessmentSession = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
    include: {
      scale: {
        include: {
          items: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
          thresholds: { orderBy: { minScore: 'asc' } },
        },
      },
    },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (assessmentSession.status !== 'PENDING') return NextResponse.json({ error: 'Link already used' }, { status: 410 })
  if (isTokenExpired(assessmentSession.tokenExpiresAt)) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

  return NextResponse.json({
    scale: assessmentSession.scale,
    sessionId: assessmentSession.id,
  })
}

const SubmitSchema = z.object({
  itemScores: z.record(z.string(), z.union([z.number(), z.string()])),
})

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const assessmentSession = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
    include: {
      patient: { select: { anonymousId: true } },
      scale: {
        include: {
          thresholds: { orderBy: { minScore: 'asc' } },
          items: { include: { options: true } },
        },
      },
    },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (assessmentSession.status !== 'PENDING') return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
  if (isTokenExpired(assessmentSession.tokenExpiresAt)) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

  const body = await req.json()
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { itemScores } = parsed.data
  const validation = validateItemScores(assessmentSession.scale.items, itemScores)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  const totalScore = computeNumericScore(itemScores)
  const severity = lookupSeverity(totalScore, assessmentSession.scale.thresholds)

  try {
    await prisma.$transaction([
      prisma.questionnaireResponse.create({
        data: { sessionId: assessmentSession.id, itemScores, totalScore, severity },
      }),
      prisma.assessmentSession.update({
        where: { id: assessmentSession.id },
        data: { status: 'COMPLETED' },
      }),
    ])
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
    }
    throw err
  }

  await createSessionSubmitNotifications({
    sessionId: assessmentSession.id,
    patientId: assessmentSession.patientId,
    psychologistId: assessmentSession.psychologistId,
    anonymousId: assessmentSession.patient.anonymousId,
    scaleName: assessmentSession.scale.name,
    totalScore,
    itemScores: itemScores as Record<string, number>,
    storedSeverity: severity,
  })

  return NextResponse.json({ ok: true })
}
