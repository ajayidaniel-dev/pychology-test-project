import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import { deleteArea, updateArea } from '@/lib/areas'
import { isSpecialty } from '@/lib/specialties'

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  specialty: z.string().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageAreas')
  if (denied) return denied

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (
    parsed.data.specialty !== undefined &&
    parsed.data.specialty !== null &&
    !isSpecialty(parsed.data.specialty)
  ) {
    return NextResponse.json({ error: 'Invalid specialty' }, { status: 400 })
  }

  const result = await updateArea({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    areaId: params.id,
    name: parsed.data.name,
    specialty: parsed.data.specialty as Parameters<typeof updateArea>[0]['specialty'],
    description: parsed.data.description,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageAreas')
  if (denied) return denied

  const result = await deleteArea({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    areaId: params.id,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
