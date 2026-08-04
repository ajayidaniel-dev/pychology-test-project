import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import { findAccessiblePatient } from '@/lib/patient-access'
import { z } from 'zod'

const CreateNoteSchema = z.object({
  patientId: z.string().min(1),
  sessionId: z.string().min(1).nullable().optional(),
  questionnaireId: z.string().min(1).nullable().optional(),
  body: z.string().trim().min(1).max(10000),
})

const noteInclude = {
  session: { select: { id: true, title: true } },
  questionnaire: {
    select: { id: true, sessionId: true, scale: { select: { name: true } } },
  },
} as const

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const denied = forbiddenUnless(ctx.role, 'writeNotes')
  if (denied) return denied
  const db = scopedDb(ctx)

  const parsed = CreateNoteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { patientId, body, questionnaireId } = parsed.data
  let sessionId = parsed.data.sessionId ?? null

  const patient = await findAccessiblePatient(db, ctx, patientId, {
    select: { id: true },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // A questionnaire target implies its parent session, so the note always
  // resolves to a session even when the caller only sent the questionnaire.
  if (questionnaireId) {
    const questionnaire = await db.questionnaire.findFirst({
      where: { id: questionnaireId, session: { patientId } },
      select: { sessionId: true },
    })
    if (!questionnaire) {
      return NextResponse.json({ error: 'Questionnaire not found' }, { status: 400 })
    }
    sessionId = questionnaire.sessionId
  } else if (sessionId) {
    const clinicalSession = await db.clinicalSession.findFirst({
      where: { id: sessionId, patientId },
      select: { id: true },
    })
    if (!clinicalSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 400 })
    }
  }

  const note = await db.note.create({
    data: {
      practiceId: ctx.practiceId,
      authorId: ctx.userId,
      patientId,
      sessionId,
      questionnaireId: questionnaireId ?? null,
      body,
    },
    include: noteInclude,
  })

  return NextResponse.json(note, { status: 201 })
}

export async function GET(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const denied = forbiddenUnless(ctx.role, 'viewNotes')
  if (denied) return denied
  const db = scopedDb(ctx)

  const patientId = req.nextUrl.searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

  const sessionId = req.nextUrl.searchParams.get('sessionId')
  const questionnaireId = req.nextUrl.searchParams.get('questionnaireId')

  // Filters are exact, not cascading: asking for a session's notes returns the
  // ones filed on the session itself, not those on its questionnaires. With no
  // filter you get the patient's whole stream.
  const accessible = await findAccessiblePatient(db, ctx, patientId, {
    select: { id: true },
  })
  if (!accessible) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const notes = await db.note.findMany({
    where: {
      patientId,
      ...(questionnaireId
        ? { questionnaireId }
        : sessionId
          ? { sessionId, questionnaireId: null }
          : {}),
    },
    include: noteInclude,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(notes)
}
