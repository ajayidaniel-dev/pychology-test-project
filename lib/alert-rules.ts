export type AlertSeverity = 'critical' | 'high' | 'moderate' | null

export interface AlertResult {
  severity: AlertSeverity
  suicidalIdeation: boolean
}

type KnownScale = 'PHQ9' | 'BDI2' | 'GAD7'

export function computeAlerts(
  scale: string,
  totalScore: number,
  itemScores: Record<string, number>,
  storedSeverity?: string
): AlertResult {
  const severity = getSeverity(scale, totalScore) ?? normaliseStoredSeverity(storedSeverity)
  const suicidalIdeation =
    scale === 'PHQ9' && (itemScores['9'] ?? 0) > 0

  return { severity, suicidalIdeation }
}

function getSeverity(scale: string, score: number): AlertSeverity {
  if (scale === 'PHQ9') {
    if (score >= 20) return 'critical'
    if (score >= 15) return 'high'
    if (score >= 10) return 'moderate'
    return null
  }
  if (scale === 'BDI2') {
    if (score >= 29) return 'critical'
    if (score >= 20) return 'high'
    if (score >= 14) return 'moderate'
    return null
  }
  if (scale === 'GAD7') {
    if (score >= 15) return 'critical'
    if (score >= 10) return 'high'
    if (score >= 5) return 'moderate'
    return null
  }
  return null
}

export interface ScaleMeta {
  maxScore: number
  /** Minimum score for each severity band. */
  thresholds: { critical: number; high: number; moderate: number }
}

const SCALE_META: Record<KnownScale, ScaleMeta> = {
  PHQ9: { maxScore: 27, thresholds: { critical: 20, high: 15, moderate: 10 } },
  BDI2: { maxScore: 63, thresholds: { critical: 29, high: 20, moderate: 14 } },
  GAD7: { maxScore: 21, thresholds: { critical: 15, high: 10, moderate: 5 } },
}

export function getScaleMeta(scale: string): ScaleMeta | null {
  return SCALE_META[scale as KnownScale] ?? null
}

/** The threshold the given severity band starts at, when the scale is known. */
export function getThresholdCrossed(
  scale: string,
  severity: AlertSeverity,
): number | null {
  if (!severity) return null
  return SCALE_META[scale as KnownScale]?.thresholds[severity] ?? null
}

function normaliseStoredSeverity(s?: string): AlertSeverity {
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower === 'critical' || lower === 'severe') return 'critical'
  if (lower === 'high') return 'high'
  if (lower === 'moderate' || lower === 'medium' || lower === 'mild') return 'moderate'
  return null
}
