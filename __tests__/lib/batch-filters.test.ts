import { filterPatientsForBatch } from '@/lib/batch-filters'
import type { PatientListItem } from '@/lib/patient-summary'
import type { SeverityLevel } from '@/components/ui/severity-badge'

const NOW = new Date('2026-07-22T12:00:00Z')

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)
}

function patient(
  id: string,
  severity: SeverityLevel | null,
  lastAssessedAt: Date | null,
): PatientListItem {
  return {
    id,
    anonymousId: `P-${id}`,
    displayName: null,
    sessionCount: lastAssessedAt ? 1 : 0,
    latestScore: null,
    latestScaleName: null,
    severity,
    createdAt: daysAgo(365),
    delta: null,
    scoreHistory: [],
    lastAssessedAt,
    latestMaxScore: null,
    latestThreshold: null,
  }
}

const high = patient('high', 'high', daysAgo(10))
const moderate = patient('moderate', 'moderate', daysAgo(45))
const low = patient('low', 'low', daysAgo(100))
const neverAssessed = patient('never', null, null)
const all = [high, moderate, low, neverAssessed]

const ids = (list: PatientListItem[]) => list.map((p) => p.id)

describe('filterPatientsForBatch', () => {
  it('returns everyone when no criteria are set', () => {
    expect(ids(filterPatientsForBatch(all, {}, NOW))).toEqual([
      'high',
      'moderate',
      'low',
      'never',
    ])
  })

  it('treats an empty severity array as "any severity"', () => {
    expect(filterPatientsForBatch(all, { severity: [] }, NOW)).toHaveLength(4)
  })

  it('keeps only the selected severity levels', () => {
    const result = filterPatientsForBatch(all, { severity: ['high'] }, NOW)
    expect(ids(result)).toEqual(['high'])
  })

  it('accepts several severity levels at once', () => {
    const result = filterPatientsForBatch(
      all,
      { severity: ['high', 'moderate'] },
      NOW,
    )
    expect(ids(result)).toEqual(['high', 'moderate'])
  })

  it('excludes never-assessed patients when filtering by severity', () => {
    const result = filterPatientsForBatch(all, { severity: ['low'] }, NOW)
    expect(ids(result)).toEqual(['low'])
  })

  it('keeps patients whose last assessment is older than the cutoff', () => {
    const result = filterPatientsForBatch(all, { notAssessedInDays: 30 }, NOW)
    expect(ids(result)).toEqual(['moderate', 'low', 'never'])
  })

  it('includes never-assessed patients — they are overdue by definition', () => {
    const result = filterPatientsForBatch(
      [neverAssessed],
      { notAssessedInDays: 180 },
      NOW,
    )
    expect(ids(result)).toEqual(['never'])
  })

  it('includes a patient assessed exactly at the cutoff', () => {
    const borderline = patient('borderline', 'low', daysAgo(30))
    const result = filterPatientsForBatch(
      [borderline],
      { notAssessedInDays: 30 },
      NOW,
    )
    expect(ids(result)).toEqual(['borderline'])
  })

  it('excludes a patient assessed just inside the cutoff', () => {
    const recent = patient('recent', 'low', daysAgo(29))
    const result = filterPatientsForBatch(
      [recent],
      { notAssessedInDays: 30 },
      NOW,
    )
    expect(result).toEqual([])
  })

  it('applies both criteria together', () => {
    const result = filterPatientsForBatch(
      all,
      { severity: ['high', 'moderate'], notAssessedInDays: 30 },
      NOW,
    )
    // 'high' was assessed 10 days ago, so the recency filter drops it.
    expect(ids(result)).toEqual(['moderate'])
  })

  it('does not mutate the input array', () => {
    const input = [...all]
    filterPatientsForBatch(input, { severity: ['high'] }, NOW)
    expect(input).toHaveLength(4)
  })
})
