import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb, type ScopedDb } from '@/lib/db'
import { z } from 'zod'

const UpdateThresholdSchema = z.object({
  label: z.string().min(1).optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
})

async function assertOwner(
  db: ScopedDb,
  scaleId: string,
  thresholdId: string,
  userId: string,
) {
  return db.severityThreshold.findFirst({
    where: {
      id: thresholdId,
      scaleId,
      scale: { psychologistId: userId, isLibrary: false },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; thresholdId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const threshold = await assertOwner(db, params.id, params.thresholdId, ctx.userId)
  if (!threshold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateThresholdSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await db.severityThreshold.update({
    where: { id: params.thresholdId },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; thresholdId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const threshold = await assertOwner(db, params.id, params.thresholdId, ctx.userId)
  if (!threshold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.severityThreshold.delete({ where: { id: params.thresholdId } })
  return NextResponse.json({ ok: true })
}
