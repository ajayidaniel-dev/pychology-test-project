import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'
import { nextAnonymousIdFrom } from '@/lib/anonymous-id'
import {
  PATIENT_QUESTIONNAIRES_INCLUDE,
  flattenQuestionnaires,
} from '@/lib/patient-summary'
import { patientVisibilityWhere } from '@/lib/patient-access'
import { setPatientAreas } from '@/lib/areas'
import { can } from '@/lib/roles'
import { practiceNotActive } from '@/lib/practices'

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const visibility = await patientVisibilityWhere(db, ctx)
  const patients = await db.patient.findMany({
    where: visibility,
    include: PATIENT_QUESTIONNAIRES_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )
}

const CreatePatientSchema = z.object({
  displayName: z.string().min(1),
  areaIds: z.array(z.string().min(1)).max(50).optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  if (!can(ctx.role, 'managePatients')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const gated = practiceNotActive(ctx.practiceStatus)
  if (gated) return gated

  const db = scopedDb(ctx)

  const body = await req.json()
  const parsed = CreatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const patient = await db.$transaction(async (tx) => {
    // Derived from the ids already issued, not from the patient count — see
    // lib/anonymous-id.ts. Counting collides with a live id after any deletion.
    //
    // Scoped to the practice, not the clinician: anonymous ids are unique per
    // practice now, so scoping this any narrower lets two clinicians in the
    // same practice generate the same id and collide on insert.
    const existing = await tx.patient.findMany({
      where: { practiceId: ctx.practiceId },
      select: { anonymousId: true },
    })
    return tx.patient.create({
      data: {
        practiceId: ctx.practiceId,
        displayName: parsed.data.displayName,
        anonymousId: nextAnonymousIdFrom(existing.map((p) => p.anonymousId)),
        psychologistId: ctx.userId,
      },
    })
  }, { isolationLevel: 'Serializable' })

  if (parsed.data.areaIds && parsed.data.areaIds.length > 0) {
    await setPatientAreas({
      practiceId: ctx.practiceId,
      actorId: ctx.userId,
      patientId: patient.id,
      areaIds: parsed.data.areaIds,
    })
  }

  return NextResponse.json(patient, { status: 201 })
}
