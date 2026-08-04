import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import {
  createReferral,
  listHistory,
  listInbox,
  listOutbox,
} from '@/lib/referrals'
import { findAccessiblePatient } from '@/lib/patient-access'

const CreateSchema = z.object({
  patientId: z.string().min(1),
  reason: z.string().trim().min(1).max(2000),
  priority: z.enum(['ROUTINE', 'PRIORITY', 'URGENT']).optional(),
  sourceAreaId: z.string().nullable().optional(),
  targetAreaId: z.string().nullable().optional(),
  targetUserId: z.string().nullable().optional(),
  send: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageReferrals')
  if (denied) return denied

  const box = req.nextUrl.searchParams.get('box') ?? 'inbox'
  const db = scopedDb(ctx)

  if (box === 'outbox') {
    const referrals = await listOutbox(db, ctx.userId)
    return NextResponse.json({ referrals })
  }

  if (box === 'history') {
    const referrals = await listHistory(db, {
      practiceId: ctx.practiceId,
      userId: ctx.userId,
      membershipId: ctx.membershipId,
    })
    return NextResponse.json({ referrals })
  }

  const referrals = await listInbox(db, {
    practiceId: ctx.practiceId,
    userId: ctx.userId,
    membershipId: ctx.membershipId,
  })
  return NextResponse.json({ referrals })
}

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageReferrals')
  if (denied) return denied

  const parsed = CreateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const db = scopedDb(ctx)
  const patient = await findAccessiblePatient(db, ctx, parsed.data.patientId, {
    select: { id: true },
  })
  if (!patient) {
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  }

  const result = await createReferral({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    patientId: parsed.data.patientId,
    reason: parsed.data.reason,
    priority: parsed.data.priority,
    sourceAreaId: parsed.data.sourceAreaId,
    targetAreaId: parsed.data.targetAreaId,
    targetUserId: parsed.data.targetUserId,
    send: parsed.data.send ?? true,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ id: result.referralId }, { status: 201 })
}
