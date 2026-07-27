import { directSendTitle, sendStatus } from '@/lib/direct-sends'

describe('directSendTitle', () => {
  it('names a single-scale send after that scale', () => {
    expect(directSendTitle(['PHQ-9'])).toBe('PHQ-9')
  })

  it('lists every scale while the list stays readable', () => {
    expect(directSendTitle(['PHQ-9', 'GAD-7', 'BDI-II'])).toBe(
      'PHQ-9, GAD-7, BDI-II',
    )
  })

  it('summarises the tail once there are too many to name', () => {
    expect(directSendTitle(['PHQ-9', 'GAD-7', 'BDI-II', 'AUDIT', 'PCL-5'])).toBe(
      'PHQ-9, GAD-7, BDI-II +2 more',
    )
  })

  it('preserves the order the scales were picked in', () => {
    expect(directSendTitle(['GAD-7', 'PHQ-9'])).toBe('GAD-7, PHQ-9')
  })

  it('still reads as something when every scale is gone', () => {
    expect(directSendTitle([])).toBe('Questionnaires')
  })
})

describe('sendStatus', () => {
  const now = new Date('2026-07-27T12:00:00Z')
  const future = new Date('2026-07-29T12:00:00Z')
  const past = new Date('2026-07-26T12:00:00Z')

  const send = (over: Partial<Parameters<typeof sendStatus>[0]> = {}) => ({
    status: 'SCHEDULED',
    tokenExpiresAt: future,
    questionnaires: [{ status: 'PENDING' }],
    ...over,
  })

  it('is pending while the link is live and work is outstanding', () => {
    expect(sendStatus(send(), now)).toBe('pending')
  })

  it('is completed once every questionnaire is answered', () => {
    expect(
      sendStatus(
        send({ questionnaires: [{ status: 'COMPLETED' }, { status: 'COMPLETED' }] }),
        now,
      ),
    ).toBe('completed')
  })

  it('is expired when the link lapsed with work outstanding', () => {
    expect(sendStatus(send({ tokenExpiresAt: past }), now)).toBe('expired')
  })

  it('stays completed when the link lapsed after everything was answered', () => {
    expect(
      sendStatus(
        send({ tokenExpiresAt: past, questionnaires: [{ status: 'COMPLETED' }] }),
        now,
      ),
    ).toBe('completed')
  })

  it('reports cancellation ahead of anything else', () => {
    expect(
      sendStatus(
        send({
          status: 'CANCELLED',
          tokenExpiresAt: past,
          questionnaires: [{ status: 'COMPLETED' }],
        }),
        now,
      ),
    ).toBe('cancelled')
  })

  it('does not call an empty send completed', () => {
    expect(sendStatus(send({ questionnaires: [] }), now)).toBe('pending')
  })
})
