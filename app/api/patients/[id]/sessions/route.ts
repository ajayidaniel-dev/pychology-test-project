import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'
import { fillUrlFor } from '@/lib/request-origin'

const CreateSessionSchema = z.object({
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(2000).optional(),
  scheduledAt: z.coerce.date(),
  collectDetails: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const clinicalSession = await prisma.clinicalSession.create({
    data: {
      patientId: params.id,
      psychologistId: session.user.id,
      title: parsed.data.title,
      reason: parsed.data.reason || null,
      scheduledAt: parsed.data.scheduledAt,
      collectDetails: parsed.data.collectDetails,
      token: generateToken(),
      tokenExpiresAt: tokenExpiresAt(),
    },
  })

  return NextResponse.json(
    { ...clinicalSession, fillUrl: fillUrlFor(req, clinicalSession.token) },
    { status: 201 },
  )
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessions = await prisma.clinicalSession.findMany({
    where: { patientId: params.id, psychologistId: session.user.id },
    include: {
      questionnaires: {
        include: { response: true, scale: { select: { id: true, name: true } } },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  return NextResponse.json(sessions)
}
