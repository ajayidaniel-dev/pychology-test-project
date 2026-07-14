import {
  computeNumericScore,
  lookupSeverity,
  validateItemScores,
  FREE_TEXT_MAX_LENGTH,
} from '@/lib/scale-scoring'

describe('computeNumericScore', () => {
  it('sums numeric values only', () => {
    const scores = { '1': 2, '2': 3, '3': 1 }
    expect(computeNumericScore(scores)).toBe(6)
  })

  it('ignores string values (free text)', () => {
    const scores = { '1': 2, '2': 'some text', '3': 1 }
    expect(computeNumericScore(scores as any)).toBe(3)
  })

  it('returns 0 for empty scores', () => {
    expect(computeNumericScore({})).toBe(0)
  })
})

describe('validateItemScores', () => {
  const mc = (order: number) => ({
    order,
    type: 'MULTIPLE_CHOICE' as const,
    required: true,
    options: [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }],
  })

  const items = [
    mc(1),
    mc(2),
    { order: 3, type: 'YES_NO' as const, required: true, options: [] },
    { order: 4, type: 'NUMBER' as const, required: true, options: [] },
    { order: 5, type: 'FREE_TEXT' as const, required: false, options: [] },
  ]

  it('accepts a valid submission', () => {
    const result = validateItemScores(items, { '1': 2, '2': 0, '3': 1, '4': 42, '5': 'feeling ok' })
    expect(result).toEqual({ ok: true })
  })

  it('accepts 0 for free-text items (current fill form behavior)', () => {
    expect(validateItemScores(items, { '1': 2, '2': 0, '3': 1, '4': 7, '5': 0 }).ok).toBe(true)
  })

  it('allows omitting non-required items', () => {
    expect(validateItemScores(items, { '1': 2, '2': 0, '3': 1, '4': 7 }).ok).toBe(true)
  })

  it('rejects unknown item keys', () => {
    const result = validateItemScores(items, { '1': 2, '2': 0, '3': 1, '4': 7, '99': 3 })
    expect(result.ok).toBe(false)
  })

  it('rejects missing required items', () => {
    const result = validateItemScores(items, { '1': 2 })
    expect(result.ok).toBe(false)
  })

  it('rejects out-of-range multiple choice values', () => {
    const result = validateItemScores(items, { '1': 5000, '2': 0, '3': 1, '4': 7 })
    expect(result.ok).toBe(false)
  })

  it('rejects non-numeric answers for scored items', () => {
    const result = validateItemScores(items, { '1': 'two' as any, '2': 0, '3': 1, '4': 7 })
    expect(result.ok).toBe(false)
  })

  it('rejects yes/no values outside 0 and 1 when item has no options', () => {
    const result = validateItemScores(items, { '1': 2, '2': 0, '3': 2, '4': 7 })
    expect(result.ok).toBe(false)
  })

  it('rejects non-finite numbers', () => {
    const result = validateItemScores(items, { '1': 2, '2': 0, '3': 1, '4': Infinity })
    expect(result.ok).toBe(false)
  })

  it('rejects free text over the max length', () => {
    const long = 'a'.repeat(FREE_TEXT_MAX_LENGTH + 1)
    const result = validateItemScores(items, { '1': 2, '2': 0, '3': 1, '4': 7, '5': long })
    expect(result.ok).toBe(false)
  })
})

describe('lookupSeverity', () => {
  const thresholds = [
    { label: 'Mild', minScore: 0, maxScore: 9 },
    { label: 'Moderate', minScore: 10, maxScore: 19 },
    { label: 'Severe', minScore: 20, maxScore: 27 },
  ]

  it('returns correct label for score in range', () => {
    expect(lookupSeverity(14, thresholds)).toBe('Moderate')
  })

  it('returns label for boundary scores', () => {
    expect(lookupSeverity(0, thresholds)).toBe('Mild')
    expect(lookupSeverity(27, thresholds)).toBe('Severe')
  })

  it('returns "unclassified" when no threshold matches', () => {
    expect(lookupSeverity(30, thresholds)).toBe('unclassified')
  })

  it('returns "unclassified" for empty thresholds', () => {
    expect(lookupSeverity(10, [])).toBe('unclassified')
  })
})
