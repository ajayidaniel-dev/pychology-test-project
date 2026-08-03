import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const scale = await db.scale.findFirst({
    where: {
      id: params.id,
      OR: [{ isLibrary: true }, { psychologistId: ctx.userId }],
    },
    include: {
      items: {
        orderBy: { order: 'asc' },
        include: { options: { orderBy: { order: 'asc' } } },
      },
      thresholds: { orderBy: { minScore: 'asc' } },
    },
  })

  if (!scale) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(scale)
}

const UpdateScaleSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const scale = await db.scale.findFirst({
    where: { id: params.id, psychologistId: ctx.userId, isLibrary: false },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateScaleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await db.scale.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const scale = await db.scale.findFirst({
    where: { id: params.id, psychologistId: ctx.userId, isLibrary: false },
    include: { _count: { select: { questionnaires: true } } },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })
  if (scale._count.questionnaires > 0) {
    return NextResponse.json({ error: 'Cannot delete a scale already used in a questionnaire' }, { status: 409 })
  }

  await db.scale.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
