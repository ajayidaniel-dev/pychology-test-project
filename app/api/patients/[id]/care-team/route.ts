import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { findAccessiblePatient } from '@/lib/patient-access'
import {
  addCareTeamMember,
  listCareTeam,
  removeCareTeamMember,
} from '@/lib/care-teams'
import { can } from '@/lib/roles'

const AddSchema = z.object({
  userId: z.string().min(1),
})

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await findAccessiblePatient(db, ctx, params.id, {
    select: { id: true },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const members = await listCareTeam(db, params.id)
  return NextResponse.json({ members })
}

export async function POST(
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

  const parsed = AddSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const result = await addCareTeamMember({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    patientId: params.id,
    userId: parsed.data.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ id: result.id }, { status: 201 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  if (!can(ctx.role, 'managePatients')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  const db = scopedDb(ctx)
  const patient = await findAccessiblePatient(db, ctx, params.id, {
    select: { id: true },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const result = await removeCareTeamMember({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    patientId: params.id,
    userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
