import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { PatientAccessMode } from '@prisma/client'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import { writeAuditEntry } from '@/lib/audit'
import {
  PATIENT_ACCESS_DESCRIPTIONS,
  PATIENT_ACCESS_LABELS,
} from '@/lib/patient-access'

const PatchSchema = z.object({
  patientAccess: z.enum(['OPEN', 'AREA_SCOPED', 'ASSIGNED_ONLY']),
})

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const db = scopedDb(ctx)
  const practice = await db.practice.findFirst({
    where: { id: ctx.practiceId },
    select: { patientAccess: true, name: true },
  })
  if (!practice) {
    return NextResponse.json({ error: 'Practice not found' }, { status: 404 })
  }

  return NextResponse.json({
    patientAccess: practice.patientAccess,
    labels: PATIENT_ACCESS_LABELS,
    descriptions: PATIENT_ACCESS_DESCRIPTIONS,
    canEdit: ctx.role === 'OWNER' || ctx.role === 'ADMIN',
  })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageAreas')
  if (denied) return denied

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const db = scopedDb(ctx)
  const mode = parsed.data.patientAccess as PatientAccessMode

  await db.practice.update({
    where: { id: ctx.practiceId },
    data: { patientAccess: mode },
  })

  await writeAuditEntry(db, {
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    action: 'practice.patient_access_changed',
    subjectType: 'Practice',
    subjectId: ctx.practiceId,
    metadata: { patientAccess: mode },
  })

  return NextResponse.json({ patientAccess: mode })
}
