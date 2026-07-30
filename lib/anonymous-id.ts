const ANONYMOUS_ID = /^P-(\d+)$/

export function buildAnonymousId(n: number): string {
  return `P-${String(n).padStart(3, '0')}`
}

/**
 * Highest numeric suffix among a clinician's existing ids; 0 when none parse.
 *
 * Tolerates historical widths — `P-0001` and `P-001` both parse — so a practice
 * seeded with a different padding keeps counting up rather than restarting.
 */
export function highestAnonymousIdNumber(existing: string[]): number {
  return existing.reduce((max, id) => {
    const match = ANONYMOUS_ID.exec(id)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
}

/**
 * Next id for a clinician, derived from the ids they already have.
 *
 * Deliberately NOT derived from the patient count. Counting breaks the moment a
 * patient is deleted: with P-001..P-003 on file, deleting P-002 leaves a count
 * of 2, so the next patient is assigned P-003 — which already exists. That
 * violates `@@unique([anonymousId, psychologistId])` and fails the creation
 * with an unhandled 500.
 */
export function nextAnonymousIdFrom(existing: string[]): string {
  return buildAnonymousId(highestAnonymousIdNumber(existing) + 1)
}
