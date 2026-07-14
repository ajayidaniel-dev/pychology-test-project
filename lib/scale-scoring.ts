export const FREE_TEXT_MAX_LENGTH = 2000

type ValidatableItem = {
  order: number
  type: 'MULTIPLE_CHOICE' | 'YES_NO' | 'FREE_TEXT' | 'NUMBER'
  required: boolean
  options: { value: number | null }[]
}

export type ItemScoresValidation =
  | { ok: true }
  | { ok: false; error: string }

export function validateItemScores(
  items: ValidatableItem[],
  itemScores: Record<string, number | string>
): ItemScoresValidation {
  const itemsByKey = new Map(items.map(item => [String(item.order), item]))

  for (const key of Object.keys(itemScores)) {
    if (!itemsByKey.has(key)) {
      return { ok: false, error: `Unknown item "${key}"` }
    }
  }

  for (const item of items) {
    const key = String(item.order)
    const value = itemScores[key]

    if (value === undefined) {
      if (item.required) return { ok: false, error: `Item ${key} is required` }
      continue
    }

    switch (item.type) {
      case 'FREE_TEXT': {
        // The fill form currently submits 0 for free-text items
        const isText = typeof value === 'string' && value.length <= FREE_TEXT_MAX_LENGTH
        if (!isText && value !== 0) {
          return { ok: false, error: `Item ${key}: invalid free-text answer` }
        }
        break
      }
      case 'NUMBER': {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          return { ok: false, error: `Item ${key}: must be a number` }
        }
        break
      }
      case 'YES_NO':
      case 'MULTIPLE_CHOICE': {
        // YES_NO items without configured options render as Yes=1 / No=0
        const allowed =
          item.options.length > 0
            ? item.options.map(o => o.value ?? 0)
            : item.type === 'YES_NO'
              ? [0, 1]
              : []
        if (typeof value !== 'number' || !allowed.includes(value)) {
          return { ok: false, error: `Item ${key}: answer is not a valid option` }
        }
        break
      }
    }
  }

  return { ok: true }
}

export function computeNumericScore(
  itemScores: Record<string, number | string>
): number {
  return Object.values(itemScores).reduce<number>((sum, val) => {
    return typeof val === 'number' ? sum + val : sum
  }, 0)
}

export function lookupSeverity(
  score: number,
  thresholds: { label: string; minScore: number; maxScore: number }[]
): string {
  const match = thresholds.find(t => score >= t.minScore && score <= t.maxScore)
  return match?.label ?? 'unclassified'
}
