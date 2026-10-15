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

/**
 * A direct send's title is just its scale names, which would read identically
 * to a questionnaire target in the picker. Naming it as a send keeps the two
 * distinguishable.
 */
function targetLabel(session: { title: string; kind?: string }): string {
  return session.kind === "DIRECT" ? `Sent · ${session.title}` : session.title
}

export function sessionTarget(session: {
  id: string
  title: string
  kind?: string
}): NoteTarget {
  return {
    value: `session:${session.id}`,
    label: targetLabel(session),
    sessionId: session.id,
    questionnaireId: null,
  }
}

export function questionnaireTarget(
  questionnaire: { id: string; scale: { name: string } },
  session: { id: string; title: string; kind?: string },
): NoteTarget {
  return {
    value: `questionnaire:${questionnaire.id}`,
    label: `${questionnaire.scale.name} · ${targetLabel(session)}`,
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
