import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'
import { findAccessiblePatient } from '@/lib/patient-access'
import { can } from '@/lib/roles'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await findAccessiblePatient(db, ctx, params.id, {
    include: {
      clinicalSessions: {
        include: {
          questionnaires: {
            include: { response: true, scale: { select: { id: true, name: true } } },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      },
      areas: {
        select: { area: { select: { id: true, name: true, specialty: true } } },
      },
      careTeam: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(patient)
}

const UpdatePatientSchema = z.object({
  displayName: z.string().min(1),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await findAccessiblePatient(db, ctx, params.id, {
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!can(ctx.role, 'managePatients')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = UpdatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await db.patient.update({
    where: { id: params.id },
    data: { displayName: parsed.data.displayName },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await findAccessiblePatient(db, ctx, params.id, {
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!can(ctx.role, 'managePatients')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.patient.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
