/**
 * Direct sends — questionnaires issued to a patient without an appointment.
 *
 * They are stored as `ClinicalSession` rows with `kind: DIRECT` so the fill
 * token, consent and scoring paths stay single-implementation. What a direct
 * send lacks is a clinician-authored title and a meaningful date: nobody types
 * "Intake" when they just want to push a PHQ-9 out. Both are derived here so
 * every surface that has to name one — the table, the header, the breadcrumb,
 * a note's "attached to" chip — agrees.
 */

/** Beyond this the title stops informing and starts overflowing the column. */
const MAX_NAMED_SCALES = 3

/**
 * Names a direct send after what it actually contains: "PHQ-9", "PHQ-9, GAD-7",
 * or "PHQ-9, GAD-7, BDI-II +2 more". Empty input can only mean a send whose
 * scales were all deleted afterwards, so it still has to read as something.
 */
export function directSendTitle(scaleNames: string[]): string {
  if (scaleNames.length === 0) return 'Questionnaires'

  const named = scaleNames.slice(0, MAX_NAMED_SCALES).join(', ')
  const remaining = scaleNames.length - MAX_NAMED_SCALES

  return remaining > 0 ? `${named} +${remaining} more` : named
}

/**
 * How many questionnaires a single send can carry. Matches the batch cap: past
 * this, a patient is being handed a form they will not finish in one sitting.
 */
export const MAX_SEND_SCALES = 20

/** What a send is doing right now, rolled up from its questionnaires and link. */
export type SendStatus = 'completed' | 'pending' | 'expired' | 'cancelled'

interface SendStatusInput {
  status: string
  tokenExpiresAt: Date
  questionnaires: { status: string }[]
}

/**
 * Precedence matters. Cancelled wins outright. A send whose questionnaires are
 * all answered is completed even if the token has since lapsed — the link
 * expiring after the fact is not a failure. Only unanswered work makes an
 * expired link worth flagging.
 */
export function sendStatus(send: SendStatusInput, now: Date = new Date()): SendStatus {
  if (send.status === 'CANCELLED') return 'cancelled'

  const answered =
    send.questionnaires.length > 0 &&
    send.questionnaires.every((q) => q.status === 'COMPLETED')
  if (answered) return 'completed'

  return send.tokenExpiresAt.getTime() <= now.getTime() ? 'expired' : 'pending'
}
