import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'

const CreateSessionSchema = z.object({
  scaleId: z.string().min(1),
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

  const scaleRecord = await prisma.scale.findFirst({
    where: {
      id: parsed.data.scaleId,
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
  })
  if (!scaleRecord) return NextResponse.json({ error: 'Scale not found' }, { status: 400 })

  const token = generateToken()
  const assessmentSession = await prisma.assessmentSession.create({
    data: {
      patientId: params.id,
      psychologistId: session.user.id,
      scaleId: parsed.data.scaleId,
      collectDetails: parsed.data.collectDetails,
      token,
      tokenExpiresAt: tokenExpiresAt(),
    },
  })

  // Prefer the host the request actually came in on; behind a proxy that is
  // the forwarded host. NEXTAUTH_URL is only a last resort.
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  const origin = host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? req.nextUrl.origin)
  const fillUrl = `${origin}/fill/${token}`

  return NextResponse.json({ ...assessmentSession, fillUrl }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessions = await prisma.assessmentSession.findMany({
    where: { patientId: params.id, psychologistId: session.user.id },
    include: { response: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(sessions)
}
