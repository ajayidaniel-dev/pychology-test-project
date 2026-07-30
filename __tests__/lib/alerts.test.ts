import { deriveAlertCounts, hasCurrentIdeation } from '@/lib/alerts'

function row({
  patientId,
  scaleId,
  scaleName = 'PHQ-9',
  totalScore,
  completedAt,
  severity = null,
  itemScores = {},
}: {
  patientId: string
  scaleId: string
  scaleName?: string
  totalScore: number
  completedAt: Date
  severity?: string | null
  itemScores?: Record<string, number>
}) {
  return {
    totalScore,
    itemScores,
    severity,
    completedAt,
    questionnaire: {
      scaleId,
      scale: { name: scaleName },
      session: { patientId },
    },
  }
}

const MARCH = new Date('2026-03-01')
const JUNE = new Date('2026-06-01')

describe('deriveAlertCounts', () => {
  it('counts an assessment above the critical threshold', () => {
    // PHQ-9 critical starts at 20.
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 's1', totalScore: 22, completedAt: JUNE }),
    ])
    expect(counts).toEqual({ open: 1, critical: 1 })
  })

  it('counts moderate results as open but not critical', () => {
    // PHQ-9 moderate starts at 10, high at 15.
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 's1', totalScore: 11, completedAt: JUNE }),
    ])
    expect(counts).toEqual({ open: 1, critical: 0 })
  })

  it('ignores results below every threshold', () => {
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 's1', totalScore: 2, completedAt: JUNE }),
    ])
    expect(counts).toEqual({ open: 0, critical: 0 })
  })

  it('uses only the latest response per patient and scale', () => {
    // The whole point of the reduction: a patient who was critical in March and
    // is mild in June is not a current alert.
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 's1', totalScore: 24, completedAt: MARCH }),
      row({ patientId: 'p1', scaleId: 's1', totalScore: 3, completedAt: JUNE }),
    ])
    expect(counts).toEqual({ open: 0, critical: 0 })
  })

  it('is not order-dependent when reducing to the latest', () => {
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 's1', totalScore: 3, completedAt: JUNE }),
      row({ patientId: 'p1', scaleId: 's1', totalScore: 24, completedAt: MARCH }),
    ])
    expect(counts).toEqual({ open: 0, critical: 0 })
  })

  it('tracks each scale separately for the same patient', () => {
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 'phq', totalScore: 22, completedAt: JUNE }),
      row({
        patientId: 'p1',
        scaleId: 'gad',
        scaleName: 'GAD-7',
        totalScore: 16,
        completedAt: JUNE,
      }),
    ])
    expect(counts).toEqual({ open: 2, critical: 2 })
  })

  it('counts the same scale separately for different patients', () => {
    const counts = deriveAlertCounts([
      row({ patientId: 'p1', scaleId: 's1', totalScore: 22, completedAt: JUNE }),
      row({ patientId: 'p2', scaleId: 's1', totalScore: 21, completedAt: JUNE }),
    ])
    expect(counts).toEqual({ open: 2, critical: 2 })
  })

  // Ideation is an independent alert condition: it raises an alert on its own
  // without altering the severity band, which stays tied to the score.
  it('alerts on endorsed suicidal ideation even when the score is sub-threshold', () => {
    const counts = deriveAlertCounts([
      row({
        patientId: 'p1',
        scaleId: 's1',
        totalScore: 4,
        completedAt: JUNE,
        itemScores: { '9': 2 },
      }),
    ])
    expect(counts).toEqual({ open: 1, critical: 1 })
  })

  it('does not double-count a case that is both critical and ideation', () => {
    const counts = deriveAlertCounts([
      row({
        patientId: 'p1',
        scaleId: 's1',
        totalScore: 24,
        completedAt: JUNE,
        itemScores: { '9': 3 },
      }),
    ])
    expect(counts).toEqual({ open: 1, critical: 1 })
  })

  it('only treats item 9 as ideation on the PHQ-9', () => {
    // GAD-7 has no item 9 and no ideation question; a 9 key must not trip it.
    const counts = deriveAlertCounts([
      row({
        patientId: 'p1',
        scaleId: 's1',
        scaleName: 'GAD-7',
        totalScore: 2,
        completedAt: JUNE,
        itemScores: { '9': 2 },
      }),
    ])
    expect(counts).toEqual({ open: 0, critical: 0 })
  })

  it('ignores ideation on a superseded response', () => {
    const counts = deriveAlertCounts([
      row({
        patientId: 'p1',
        scaleId: 's1',
        totalScore: 4,
        completedAt: MARCH,
        itemScores: { '9': 2 },
      }),
      row({
        patientId: 'p1',
        scaleId: 's1',
        totalScore: 3,
        completedAt: JUNE,
        itemScores: { '9': 0 },
      }),
    ])
    expect(counts).toEqual({ open: 0, critical: 0 })
  })

  it('still counts ideation cases whose score independently crosses a threshold', () => {
    const counts = deriveAlertCounts([
      row({
        patientId: 'p1',
        scaleId: 's1',
        totalScore: 21,
        completedAt: JUNE,
        itemScores: { '9': 2 },
      }),
    ])
    expect(counts).toEqual({ open: 1, critical: 1 })
  })

  it('returns zeroes for no responses', () => {
    expect(deriveAlertCounts([])).toEqual({ open: 0, critical: 0 })
  })
})

describe('hasCurrentIdeation', () => {
  it('finds ideation on a non-latest instrument', () => {
    // The defect this was written for: a PHQ-9 endorsing ideation, followed by
    // a BDI-II on a later date, hid the flag entirely.
    expect(
      hasCurrentIdeation([
        row({
          patientId: 'p1',
          scaleId: 'phq',
          totalScore: 9,
          completedAt: MARCH,
          itemScores: { '9': 2 },
        }),
        row({
          patientId: 'p1',
          scaleId: 'bdi',
          scaleName: 'BDI-II',
          totalScore: 12,
          completedAt: JUNE,
        }),
      ]),
    ).toBe(true)
  })

  it('ignores ideation that a newer response on the same scale has cleared', () => {
    expect(
      hasCurrentIdeation([
        row({
          patientId: 'p1',
          scaleId: 'phq',
          totalScore: 9,
          completedAt: MARCH,
          itemScores: { '9': 2 },
        }),
        row({
          patientId: 'p1',
          scaleId: 'phq',
          totalScore: 8,
          completedAt: JUNE,
          itemScores: { '9': 0 },
        }),
      ]),
    ).toBe(false)
  })

  it('is false when no assessment endorses ideation', () => {
    expect(
      hasCurrentIdeation([
        row({ patientId: 'p1', scaleId: 'phq', totalScore: 9, completedAt: JUNE }),
      ]),
    ).toBe(false)
  })
})
