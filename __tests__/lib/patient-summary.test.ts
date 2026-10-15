import { shapePatientListItem } from '@/lib/patient-summary'

function q(
  scaleName: string,
  totalScore: number,
  completedAt: Date,
  extra: { severity?: string | null; itemScores?: Record<string, number> } = {},
) {
  return {
    scale: { name: scaleName },
    response: {
      totalScore,
      itemScores: extra.itemScores ?? {},
      severity: extra.severity ?? null,
      completedAt,
    },
  }
}

function patient(questionnaires: ReturnType<typeof q>[]) {
  return {
    id: 'p1',
    anonymousId: 'P-001',
    displayName: null,
    createdAt: new Date('2026-01-01'),
    questionnaires,
  }
}

const JUN_02 = new Date('2026-06-02')
const JUL_15 = new Date('2026-07-15')
const JUL_22 = new Date('2026-07-22')

describe('shapePatientListItem — selects the most concerning current assessment', () => {
  it('prefers a severe older instrument over a mild newer one', () => {
    // The real defect: a current PCL-5 of 51 (Severe) sat in the alert queue
    // while the caseload rendered the newer, milder PHQ-9 as moderate.
    const item = shapePatientListItem(
      patient([
        q('PCL-5', 51, JUL_15, { severity: 'Severe' }),
        q('PHQ-9', 7, JUL_22),
      ]),
    )
    expect(item.latestScaleName).toBe('PCL-5')
    expect(item.latestScore).toBe(51)
    expect(item.severity).toBe('critical')
    expect(item.lastAssessedAt).toEqual(JUL_15)
  })

  it('uses only the current response per instrument', () => {
    // A PHQ-9 that was critical in June but mild in July must not be selected
    // on the strength of the superseded result.
    const item = shapePatientListItem(
      patient([
        q('PHQ-9', 24, JUN_02),
        q('PHQ-9', 4, JUL_22),
        q('GAD-7', 11, JUL_15),
      ]),
    )
    expect(item.latestScaleName).toBe('GAD-7')
    expect(item.severity).toBe('high')
  })

  it('breaks ties on severity by recency', () => {
    const item = shapePatientListItem(
      patient([q('PHQ-9', 11, JUN_02), q('BDI-II', 15, JUL_22)]),
    )
    expect(item.latestScaleName).toBe('BDI-II')
    expect(item.severity).toBe('moderate')
  })

  it('selects an assessment endorsing suicidal ideation over a higher band', () => {
    const item = shapePatientListItem(
      patient([
        q('GAD-7', 16, JUL_22),
        q('BDI-II', 21, JUL_15, { itemScores: { '9': 2 } }),
      ]),
    )
    expect(item.latestScaleName).toBe('BDI-II')
  })

  it('reports the denominator and cutoff of the selected instrument', () => {
    const item = shapePatientListItem(
      patient([q('PHQ-9', 22, JUL_22), q('GAD-7', 3, JUL_22)]),
    )
    expect(item.latestScaleName).toBe('PHQ-9')
    expect(item.latestMaxScore).toBe(27)
    expect(item.latestThreshold).toBe(20)
  })

  it('keeps delta and history on the selected instrument only', () => {
    const item = shapePatientListItem(
      patient([
        q('PHQ-9', 18, JUN_02),
        q('PHQ-9', 22, JUL_22),
        q('GAD-7', 2, JUL_15),
      ]),
    )
    expect(item.latestScaleName).toBe('PHQ-9')
    expect(item.scoreHistory).toEqual([18, 22])
    expect(item.delta).toBe(4)
  })

  it('returns nulls for a patient with no completed assessments', () => {
    const item = shapePatientListItem(patient([]))
    expect(item.severity).toBeNull()
    expect(item.latestScore).toBeNull()
    expect(item.latestScaleName).toBeNull()
  })
})
