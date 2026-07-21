export interface NoteRecord {
  id: string
  body: string
  createdAt: string
  updatedAt: string
  patientId: string
  sessionId: string | null
  questionnaireId: string | null
  session: { id: string; title: string } | null
  questionnaire: {
    id: string
    sessionId: string
    scale: { name: string }
  } | null
}

/** A place a note can be filed against, for the composer's target picker. */
export interface NoteTarget {
  /** Composite so session and questionnaire ids can never collide. */
  value: string
  label: string
  sessionId: string | null
  questionnaireId: string | null
}

export const PATIENT_TARGET: NoteTarget = {
  value: "patient",
  label: "The patient (general)",
  sessionId: null,
  questionnaireId: null,
}

export function sessionTarget(session: {
  id: string
  title: string
}): NoteTarget {
  return {
    value: `session:${session.id}`,
    label: session.title,
    sessionId: session.id,
    questionnaireId: null,
  }
}

export function questionnaireTarget(
  questionnaire: { id: string; scale: { name: string } },
  session: { id: string; title: string },
): NoteTarget {
  return {
    value: `questionnaire:${questionnaire.id}`,
    label: `${questionnaire.scale.name} · ${session.title}`,
    sessionId: session.id,
    questionnaireId: questionnaire.id,
  }
}

/** The "attached to" chip shown on every note so its scope is never ambiguous. */
export function noteAttachmentLabel(note: NoteRecord): string {
  if (note.questionnaire) {
    const sessionTitle = note.session?.title
    return sessionTitle
      ? `${note.questionnaire.scale.name} · ${sessionTitle}`
      : note.questionnaire.scale.name
  }
  if (note.session) return note.session.title
  return "Patient"
}
