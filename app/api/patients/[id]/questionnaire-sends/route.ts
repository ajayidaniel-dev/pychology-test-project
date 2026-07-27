import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'
import { fillUrlFor } from '@/lib/request-origin'
import { directSendTitle, MAX_SEND_SCALES } from '@/lib/direct-sends'

/**
 * Issues questionnaires to one patient with no appointment attached. Unlike
 * `POST /sessions`, the scales are chosen up front and the link comes back
 * immediately — the whole point is that there is no second step.
 */
const CreateSendSchema = z.object({
  scaleIds: z.array(z.string()).min(1).max(MAX_SEND_SCALES),
  note: z.string().trim().max(2000).optional(),
  collectDetails: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateSendSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { note, collectDetails } = parsed.data
  // Duplicates would hand the patient the same questionnaire twice.
  const scaleIds = [...new Set(parsed.data.scaleIds)]

  // The ids arrive from the client, so ownership is checked before anything is
  // written — a caller must not be able to attach someone else's private scale.
  const scales = await prisma.scale.findMany({
    where: {
      id: { in: scaleIds },
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    select: { id: true, name: true },
  })
  if (scales.length !== scaleIds.length) {
    return NextResponse.json({ error: 'Unknown scale' }, { status: 404 })
  }

  // Title follows the order the clinician picked, not the order Prisma returned.
  const nameById = new Map(scales.map((s) => [s.id, s.name]))
  const title = directSendTitle(scaleIds.map((id) => nameById.get(id)!))

  const created = await prisma.clinicalSession.create({
    data: {
      patientId: params.id,
      psychologistId: session.user.id,
      kind: 'DIRECT',
      title,
      reason: note || null,
      // There is no appointment to date this against, so the send time is the
      // only honest timestamp — it is what the UI shows as "Sent".
      scheduledAt: new Date(),
      collectDetails,
      token: generateToken(),
      tokenExpiresAt: tokenExpiresAt(),
      questionnaires: {
        create: scaleIds.map((scaleId, index) => ({ scaleId, order: index + 1 })),
      },
    },
  })

  return NextResponse.json(
    { ...created, fillUrl: fillUrlFor(req, created.token) },
    { status: 201 },
  )
}
