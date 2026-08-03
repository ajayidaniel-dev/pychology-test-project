import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'
import { MAX_BATCH_PATIENTS } from '@/lib/batches'
import { directSendTitle, MAX_SEND_SCALES } from '@/lib/direct-sends'

/**
 * A batch fans out either appointments or direct sends. A direct batch has no
 * appointment to name or date, so both are derived server-side rather than
 * demanded from the clinician.
 */
const CreateBatchSchema = z
  .object({
    kind: z.enum(['APPOINTMENT', 'DIRECT']).optional().default('APPOINTMENT'),
    title: z.string().trim().min(1).max(120).optional(),
    reason: z.string().trim().max(2000).optional(),
    scheduledAt: z.coerce.date().optional(),
    collectDetails: z.boolean().optional().default(false),
    patientIds: z.array(z.string()).min(1).max(MAX_BATCH_PATIENTS),
    scaleIds: z.array(z.string()).min(1).max(MAX_SEND_SCALES),
  })
  .refine(
    (data) => data.kind === 'DIRECT' || (Boolean(data.title) && Boolean(data.scheduledAt)),
    { message: 'An appointment batch needs a title and a date' },
  )

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const body = await req.json()
  const parsed = CreateBatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { kind, reason, collectDetails } = parsed.data
  // Duplicate ids would silently create two sessions for the same patient, or
  // hand one patient the same questionnaire twice.
  const patientIds = [...new Set(parsed.data.patientIds)]
  const scaleIds = [...new Set(parsed.data.scaleIds)]

  // Ownership is checked before anything is written: the ids arrive from the
  // client, so a caller could otherwise assign questionnaires to patients that
  // aren't theirs.
  const patients = await db.patient.findMany({
    where: { id: { in: patientIds }, psychologistId: ctx.userId },
    select: { id: true },
  })
  if (patients.length !== patientIds.length) {
    return NextResponse.json({ error: 'Unknown patient' }, { status: 404 })
  }

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

  // A direct batch is named after its questionnaires and dated by the send
  // itself; the schema has already guaranteed an appointment batch supplied both.
  const nameById = new Map(scales.map((s) => [s.id, s.name]))
  const title =
    kind === 'DIRECT'
      ? directSendTitle(scaleIds.map((id) => nameById.get(id)!))
      : parsed.data.title!
  const scheduledAt = kind === 'DIRECT' ? new Date() : parsed.data.scheduledAt!

  const batch = await db.$transaction(async (tx) => {
    const created = await tx.sessionBatch.create({
      data: {
        practiceId: ctx.practiceId,
        psychologistId: ctx.userId,
        kind,
        title,
        reason: reason || null,
        scheduledAt,
      },
    })

    // One session — and therefore one token — per patient. The token grants
    // access to a single patient's questionnaires, so it can never be shared
    // across the batch.
    for (const patientId of patientIds) {
      await tx.clinicalSession.create({
        data: {
          batchId: created.id,
          patientId,
          practiceId: ctx.practiceId,
          psychologistId: ctx.userId,
          kind,
          title,
          reason: reason || null,
          scheduledAt,
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
    }

    return created
  })

  return NextResponse.json(batch, { status: 201 })
}

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const batches = await db.sessionBatch.findMany({
    where: { psychologistId: ctx.userId },
    include: {
      sessions: {
        select: {
          id: true,
          tokenExpiresAt: true,
          questionnaires: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(batches)
}
