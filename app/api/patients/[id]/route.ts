import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await db.patient.findFirst({
    where: { id: params.id, psychologistId: ctx.userId },
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

  const patient = await db.patient.findFirst({
    where: { id: params.id, psychologistId: ctx.userId },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await db.patient.update({
    where: { id: params.id },
    data: { displayName: parsed.data.displayName },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const patient = await db.patient.findFirst({
    where: { id: params.id, psychologistId: ctx.userId },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.patient.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
