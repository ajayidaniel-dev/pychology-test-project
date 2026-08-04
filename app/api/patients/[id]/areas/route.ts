import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { findAccessiblePatient } from '@/lib/patient-access'
import { setPatientAreas } from '@/lib/areas'
import { can } from '@/lib/roles'

const BodySchema = z.object({
  areaIds: z.array(z.string().min(1)).max(50),
})

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await findAccessiblePatient(db, ctx, params.id, {
    select: {
      id: true,
      areas: {
        select: {
          areaId: true,
          area: { select: { id: true, name: true, specialty: true } },
        },
      },
    },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    areas: patient.areas.map(
      (a: { area: { id: string; name: string; specialty: string | null } }) =>
        a.area,
    ),
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  if (!can(ctx.role, 'managePatients')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = scopedDb(ctx)
  const patient = await findAccessiblePatient(db, ctx, params.id, {
    select: { id: true },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const result = await setPatientAreas({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    patientId: params.id,
    areaIds: parsed.data.areaIds,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
