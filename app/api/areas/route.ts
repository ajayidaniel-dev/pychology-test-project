import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import { createArea, listAreas } from '@/lib/areas'
import { isSpecialty } from '@/lib/specialties'
import type { Specialty } from '@prisma/client'

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  specialty: z.string().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
})

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const areas = await listAreas(scopedDb(ctx), ctx.practiceId)
  return NextResponse.json({ areas })
}

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageAreas')
  if (denied) return denied

  const parsed = CreateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  let specialty: Specialty | null = null
  if (parsed.data.specialty) {
    if (!isSpecialty(parsed.data.specialty)) {
      return NextResponse.json({ error: 'Invalid specialty' }, { status: 400 })
    }
    specialty = parsed.data.specialty
  }

  const result = await createArea({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    name: parsed.data.name,
    specialty,
    description: parsed.data.description,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  const areas = await listAreas(scopedDb(ctx), ctx.practiceId)
  const area = areas.find((a) => a.id === result.areaId)
  return NextResponse.json({ area }, { status: 201 })
}
