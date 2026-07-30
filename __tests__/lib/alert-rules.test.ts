import { computeAlerts, type AlertResult } from '@/lib/alert-rules'

describe('computeAlerts', () => {
  it('returns critical for PHQ-9 >= 20', () => {
    const result = computeAlerts('PHQ9', 20, {})
    expect(result.severity).toBe('critical')
  })

  it('returns critical for GAD-7 >= 15', () => {
    const result = computeAlerts('GAD7', 15, {})
    expect(result.severity).toBe('critical')
  })

  it('returns critical for BDI-II >= 29', () => {
    const result = computeAlerts('BDI2', 29, {})
    expect(result.severity).toBe('critical')
  })

  it('returns moderate for PHQ-9 10-19', () => {
    const result = computeAlerts('PHQ9', 14, {})
    expect(result.severity).toBe('moderate')
  })

  it('returns null severity when below threshold', () => {
    const result = computeAlerts('PHQ9', 4, {})
    expect(result.severity).toBeNull()
  })

  it('flags suicidal ideation when PHQ-9 item 9 > 0', () => {
    const result = computeAlerts('PHQ9', 22, { '9': 1 })
    expect(result.suicidalIdeation).toBe(true)
  })

  it('does not flag suicidal ideation when item 9 is 0', () => {
    const result = computeAlerts('PHQ9', 10, { '9': 0 })
    expect(result.suicidalIdeation).toBe(false)
  })

  it('does not flag suicidal ideation for non-PHQ9 scales', () => {
    const result = computeAlerts('GAD7', 18, { '9': 1 })
    expect(result.suicidalIdeation).toBe(false)
  })
})

describe('suicide-item detection is per-instrument', () => {
  it('flags PHQ-9 item 9', () => {
    expect(computeAlerts('PHQ9', 5, { '9': 1 }).suicidalIdeation).toBe(true)
  })

  it('flags BDI-II item 9 — the Suicidal Thoughts or Wishes item', () => {
    // Regression: this returned false, so a BDI-II disclosure raised no alert
    // anywhere in the app.
    expect(computeAlerts('BDI2', 25, { '9': 2 }).suicidalIdeation).toBe(true)
  })

  it('flags BDI-II item 9 at the lowest positive score', () => {
    expect(computeAlerts('BDI2', 12, { '9': 1 }).suicidalIdeation).toBe(true)
  })

  it('does not flag a zero on a real suicide item', () => {
    expect(computeAlerts('BDI2', 21, { '9': 0 }).suicidalIdeation).toBe(false)
    expect(computeAlerts('PHQ9', 8, { '9': 0 }).suicidalIdeation).toBe(false)
  })

  it('does not flag GAD-7, which has no item 9', () => {
    expect(computeAlerts('GAD7', 10, { '9': 3 }).suicidalIdeation).toBe(false)
  })

  it('does not flag instruments whose item 9 means something else', () => {
    // AUDIT item 9 asks about injury from drinking; PCL-5 has no suicide item.
    expect(computeAlerts('AUDIT', 19, { '9': 2 }).suicidalIdeation).toBe(false)
    expect(computeAlerts('PCL5', 51, { '9': 4 }).suicidalIdeation).toBe(false)
  })
})
