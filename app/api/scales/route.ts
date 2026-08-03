import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const scales = await db.scale.findMany({
    where: {
      OR: [
        { isLibrary: true },
        { psychologistId: ctx.userId },
      ],
    },
    include: {
      _count: { select: { items: true, questionnaires: true } },
    },
    orderBy: [{ isLibrary: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(scales)
}

const CreateScaleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const body = await req.json()
  const parsed = CreateScaleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const scale = await db.scale.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      psychologistId: ctx.userId,
      isLibrary: false,
    },
  })

  return NextResponse.json(scale, { status: 201 })
}
