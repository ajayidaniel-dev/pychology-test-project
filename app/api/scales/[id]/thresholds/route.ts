import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'

const AddThresholdSchema = z.object({
  label: z.string().min(1),
  minScore: z.number().int().min(0),
  maxScore: z.number().int().min(0),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const scale = await db.scale.findFirst({
    where: { id: params.id, psychologistId: ctx.userId, isLibrary: false },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = AddThresholdSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const threshold = await db.severityThreshold.create({
    data: { ...parsed.data, scaleId: params.id },
  })

  return NextResponse.json(threshold, { status: 201 })
}
