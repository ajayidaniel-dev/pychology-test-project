import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
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
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await db.patient.findFirst({
    where: { id: params.id, psychologistId: ctx.userId },
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
  const scales = await db.scale.findMany({
    where: {
      id: { in: scaleIds },
      OR: [{ isLibrary: true }, { psychologistId: ctx.userId }],
    },
    select: { id: true, name: true },
  })
  if (scales.length !== scaleIds.length) {
    return NextResponse.json({ error: 'Unknown scale' }, { status: 404 })
  }

  // Title follows the order the clinician picked, not the order Prisma returned.
  const nameById = new Map(scales.map((s) => [s.id, s.name]))
  const title = directSendTitle(scaleIds.map((id) => nameById.get(id)!))

  const created = await db.clinicalSession.create({
    data: {
      patientId: params.id,
      practiceId: ctx.practiceId,
      psychologistId: ctx.userId,
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
        create: scaleIds.map((scaleId, index) => ({
          practiceId: ctx.practiceId,
          scaleId,
          order: index + 1,
        })),
      },
    },
  })

  return NextResponse.json(
    { ...created, fillUrl: fillUrlFor(req, created.token) },
    { status: 201 },
  )
}
