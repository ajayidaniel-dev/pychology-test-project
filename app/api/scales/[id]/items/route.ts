import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb, type ScopedDb } from '@/lib/db'
import { z } from 'zod'

const OptionSchema = z.object({
  label: z.string().min(1),
  value: z.number().nullable().optional(),
  order: z.number(),
})

const AddItemSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'YES_NO', 'FREE_TEXT', 'NUMBER']),
  order: z.number(),
  required: z.boolean().default(true),
  options: z.array(OptionSchema).optional(),
})

async function assertOwner(db: ScopedDb, scaleId: string, userId: string) {
  return db.scale.findFirst({
    where: { id: scaleId, psychologistId: userId, isLibrary: false },
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const scale = await assertOwner(db, params.id, ctx.userId)
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = AddItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { options, ...itemData } = parsed.data

  const item = await db.scaleItem.create({
    data: {
      ...itemData,
      scaleId: params.id,
      options: options?.length
        ? { create: options }
        : undefined,
    },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json(item, { status: 201 })
}
