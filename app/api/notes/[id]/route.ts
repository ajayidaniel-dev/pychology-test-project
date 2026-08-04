import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import { findAccessiblePatient } from '@/lib/patient-access'
import { z } from 'zod'

const PatchNoteSchema = z.object({
  body: z.string().trim().min(1).max(10000),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const denied = forbiddenUnless(ctx.role, 'writeNotes')
  if (denied) return denied
  const db = scopedDb(ctx)

  const existing = await db.note.findFirst({
    where: { id: params.id },
    select: { id: true, patientId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const patient = await findAccessiblePatient(db, ctx, existing.patientId, {
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = PatchNoteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const note = await db.note.update({
    where: { id: params.id },
    data: { body: parsed.data.body },
    include: {
      session: { select: { id: true, title: true } },
      questionnaire: {
        select: { id: true, sessionId: true, scale: { select: { name: true } } },
      },
    },
  })

  return NextResponse.json(note)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const denied = forbiddenUnless(ctx.role, 'writeNotes')
  if (denied) return denied
  const db = scopedDb(ctx)

  const existing = await db.note.findFirst({
    where: { id: params.id },
    select: { id: true, patientId: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const patient = await findAccessiblePatient(db, ctx, existing.patientId, {
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.note.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
