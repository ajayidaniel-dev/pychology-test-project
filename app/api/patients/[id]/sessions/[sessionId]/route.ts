import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'
import { fillUrlFor } from '@/lib/request-origin'
import { renewSessionLink } from '@/lib/session-links'

export async function GET(
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
    include: {
      patient: true,
      questionnaires: {
        include: { response: true, scale: true },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!clinicalSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...clinicalSession,
    fillUrl: fillUrlFor(req, clinicalSession.token),
  })
}

const PatchSessionSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  collectDetails: z.boolean().optional(),
  /** Mints a fresh token, extending the fill link for another TTL window. */
  renewLink: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const existing = await db.clinicalSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: ctx.userId,
    },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { renewLink, ...fields } = parsed.data

  let updated = await db.clinicalSession.update({
    where: { id: params.sessionId },
    data: fields,
  })

  if (renewLink) {
    updated = await renewSessionLink(db, params.sessionId)
  }

  return NextResponse.json({ ...updated, fillUrl: fillUrlFor(req, updated.token) })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const existing = await db.clinicalSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: ctx.userId,
    },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.clinicalSession.delete({ where: { id: params.sessionId } })

  return NextResponse.json({ ok: true })
}
