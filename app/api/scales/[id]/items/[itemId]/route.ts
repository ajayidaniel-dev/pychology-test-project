import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb, type ScopedDb } from '@/lib/db'
import { z } from 'zod'

const UpdateItemSchema = z.object({
  text: z.string().min(1).optional(),
  order: z.number().optional(),
  required: z.boolean().optional(),
})

async function assertOwner(
  db: ScopedDb,
  scaleId: string,
  itemId: string,
  userId: string,
) {
  return db.scaleItem.findFirst({
    where: {
      id: itemId,
      scaleId,
      scale: { psychologistId: userId, isLibrary: false },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const item = await assertOwner(db, params.id, params.itemId, ctx.userId)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await db.scaleItem.update({
    where: { id: params.itemId },
    data: parsed.data,
    include: { options: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const item = await assertOwner(db, params.id, params.itemId, ctx.userId)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.scaleItem.delete({ where: { id: params.itemId } })
  return NextResponse.json({ ok: true })
}
