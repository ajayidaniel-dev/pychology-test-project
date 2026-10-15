import {
  buildAnonymousId,
  highestAnonymousIdNumber,
  nextAnonymousIdFrom,
} from '@/lib/anonymous-id'

describe('buildAnonymousId', () => {
  it('pads to three digits', () => {
    expect(buildAnonymousId(1)).toBe('P-001')
    expect(buildAnonymousId(12)).toBe('P-012')
    expect(buildAnonymousId(100)).toBe('P-100')
  })

  it('does not truncate beyond three digits', () => {
    expect(buildAnonymousId(1234)).toBe('P-1234')
  })
})

describe('highestAnonymousIdNumber', () => {
  it('is zero for a clinician with no patients', () => {
    expect(highestAnonymousIdNumber([])).toBe(0)
  })

  it('finds the maximum regardless of order', () => {
    expect(highestAnonymousIdNumber(['P-003', 'P-001', 'P-002'])).toBe(3)
  })

  it('tolerates historical zero-padding widths', () => {
    expect(highestAnonymousIdNumber(['P-0001', 'P-0007'])).toBe(7)
  })

  it('ignores ids that do not match the pattern', () => {
    expect(highestAnonymousIdNumber(['legacy', 'P-004', ''])).toBe(4)
  })
})

describe('nextAnonymousIdFrom', () => {
  it('starts at P-001', () => {
    expect(nextAnonymousIdFrom([])).toBe('P-001')
  })

  it('continues from the highest issued id', () => {
    expect(nextAnonymousIdFrom(['P-001', 'P-002', 'P-003'])).toBe('P-004')
  })

  it('does not reuse an id after a deletion', () => {
    // The regression: deriving from the patient count returned P-003 here,
    // which still exists, violating the (anonymousId, psychologistId) unique
    // constraint and failing patient creation with a 500.
    expect(nextAnonymousIdFrom(['P-001', 'P-003'])).toBe('P-004')
  })

  it('does not reuse an id after the newest patient is deleted', () => {
    expect(nextAnonymousIdFrom(['P-001', 'P-002'])).toBe('P-003')
  })
})
