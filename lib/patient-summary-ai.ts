import prisma from '@/lib/prisma'
import { callAnthropic, ASSESSMENT_DATA_RULE } from '@/lib/anthropic'
import { computeAlerts, getScaleMeta } from '@/lib/alert-rules'
import { scaleNameToEnum } from '@/lib/patient-summary'
import type { ClinicalNarrative } from '@/app/api/narrative/route'
import type { IntakeAnswers } from '@/lib/consent'
import { z } from 'zod'

export type PatientSummary = {
  arc: string
  currentPicture: string
  contextFactors: string
  safety: string
  safetyConcern: boolean
  direction: 'improving' | 'stable' | 'worsening' | 'insufficient-data'
  watchFor: string
}

const SummarySchema = z.object({
  arc: z.string(),
  currentPicture: z.string(),
  contextFactors: z.string(),
  safety: z.string(),
  safetyConcern: z.boolean(),
  direction: z.enum(['improving', 'stable', 'worsening', 'insufficient-data']),
  watchFor: z.string(),
})

const OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    arc: {
      type: 'string',
      description:
        'Two to four sentences tracing how this person has changed across their assessments, oldest to most recent. Reference specific scores and dates. If there is only one assessment, say so plainly and describe the starting point instead of implying a trajectory.',
    },
    currentPicture: {
      type: 'string',
      description:
        'Two or three sentences on where the person stands as of the most recent assessment — severity band, the domains carrying the most weight.',
    },
    contextFactors: {
      type: 'string',
      description:
        'One to three sentences connecting intake context (household, employment, living situation, recent life events) to the clinical picture, where a plausible link exists. Empty string if no intake context was provided.',
    },
    safety: {
      type: 'string',
      description:
        'One or two sentences on safety across the whole history. If suicidal ideation was endorsed in any session, that is the first clinical priority and must be stated, including whether it has appeared, persisted, or resolved across sessions.',
    },
    safetyConcern: {
      type: 'boolean',
      description:
        'True if any safety-relevant item was endorsed above zero in any session in this history.',
    },
    direction: {
      type: 'string',
      enum: ['improving', 'stable', 'worsening', 'insufficient-data'],
      description:
        'Overall trajectory. Use insufficient-data when fewer than two comparable assessments exist.',
    },
    watchFor: {
      type: 'string',
      description:
        'One or two sentences on what the clinician should watch for at the next contact.',
    },
  },
  required: [
    'arc',
    'currentPicture',
    'contextFactors',
    'safety',
    'safetyConcern',
    'direction',
    'watchFor',
  ],
  additionalProperties: false,
} as const

type SessionInput = {
  scaleName: string
  totalScore: number
  severity: string
  completedAt: Date
  maxScore: number | null
  narrative: ClinicalNarrative | null
  suicidalIdeation: boolean
}

/**
 * Renders the session history as prompt lines. Each session contributes its
 * score plus, where one already exists, the per-session AI narrative — reusing
 * that work rather than re-deriving item-level analysis from raw scores.
 */
function buildSessionBlock(sessions: SessionInput[]): string {
  return sessions
    .map((s, i) => {
      const date = s.completedAt.toISOString().slice(0, 10)
      const outOf = s.maxScore !== null ? ` / ${s.maxScore}` : ''
      const lines = [
        `Assessment ${i + 1} — ${date} — ${s.scaleName}: ${s.totalScore}${outOf} (${s.severity})`,
      ]
      if (s.suicidalIdeation) {
        lines.push('  Safety: suicidal ideation endorsed in this assessment.')
      }
      if (s.narrative) {
        lines.push(`  Clinician-facing summary at the time: ${s.narrative.overallSeverity}`)
        if (s.narrative.itemPatterns) {
          lines.push(`  Item patterns: ${s.narrative.itemPatterns}`)
        }
      }
      return lines.join('\n')
    })
    .join('\n\n')
}

const INTAKE_LABELS: Record<string, string> = {
  familySize: 'Household size',
  employment: 'Employment',
  livingSituation: 'Living situation',
  lifeEvents: 'Recent life events',
}

const INTAKE_FREE_TEXT_MAX = 500

function buildIntakeBlock(intake: IntakeAnswers | null): string {
  if (!intake) return ''
  const lines = Object.entries(intake)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const value =
        typeof v === 'string' && v.length > INTAKE_FREE_TEXT_MAX
          ? `${v.slice(0, INTAKE_FREE_TEXT_MAX)}…`
          : v
      return `- ${INTAKE_LABELS[k] ?? k}: ${value}`
    })
  if (lines.length === 0) return ''
  return `\nContext the participant reported at intake:\n${lines.join('\n')}\n`
}

function buildPrompt(input: {
  anonymousId: string
  age: number | null
  sessionBlock: string
  intakeBlock: string
  sessionCount: number
}): string {
  return `You are a clinical psychologist assistant writing a longitudinal summary of one participant's assessment history, for their treating clinician to read before a session. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language.

You have no identifying information about this person — they are known to you only by an anonymous code. Do not speculate about their identity. ${ASSESSMENT_DATA_RULE}

<assessment_data>
Participant: ${input.anonymousId}${input.age !== null ? ` (age ${input.age})` : ''}
Completed assessments: ${input.sessionCount}

${input.sessionBlock}
${input.intakeBlock}</assessment_data>

Write the summary so a clinician reading it cold can answer: where did this person start, where are they now, and what changed in between. Ground every claim in the scores and dates above — do not infer progress that the data does not show. ${input.sessionCount < 2 ? 'There is only one completed assessment, so no trajectory exists yet: set direction to insufficient-data and describe the starting point rather than implying change.' : 'Compare like with like — only scores on the same scale are directly comparable.'}

Produce the structured longitudinal summary.`
}

function ageFrom(dob: Date): number {
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  if (beforeBirthday) age -= 1
  return age
}

type SummaryResult =
  | { ok: true; summary: PatientSummary; sessionCount: number }
  | { ok: false; reason: string }

/**
 * Generates the cross-session clinical summary for a patient and stores it on
 * the Patient row. Called automatically after a questionnaire is completed —
 * so it runs once per completion and captures the newest session's context.
 *
 * Resolves rather than throws for expected conditions (no completed sessions,
 * missing API key, model error) so the caller can fire-and-forget safely.
 */
export async function generateAndStorePatientSummary(
  patientId: string,
): Promise<SummaryResult> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      assessmentSessions: {
        where: { status: 'COMPLETED', response: { isNot: null } },
        include: { response: true, scale: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!patient) return { ok: false, reason: 'patient-not-found' }

  const completed = patient.assessmentSessions.filter((s) => s.response)
  if (completed.length === 0) return { ok: false, reason: 'no-completed-sessions' }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { ok: false, reason: 'no-api-key' }

  const sessionInputs: SessionInput[] = completed.map((s) => {
    const scaleEnum = scaleNameToEnum(s.scale.name)
    const itemScores = s.response!.itemScores as Record<string, number>
    const alerts = computeAlerts(
      scaleEnum,
      s.response!.totalScore,
      itemScores,
      s.response!.severity,
    )
    return {
      scaleName: s.scale.name,
      totalScore: s.response!.totalScore,
      severity: s.response!.severity,
      completedAt: s.response!.completedAt,
      maxScore: getScaleMeta(scaleEnum)?.maxScore ?? null,
      narrative: (s.response!.narrative as ClinicalNarrative | null) ?? null,
      suicidalIdeation: alerts.suicidalIdeation,
    }
  })

  // Intake context comes from the most recent response that captured any.
  const latestIntake =
    [...completed]
      .reverse()
      .map((s) => s.response!.intakeAnswers as IntakeAnswers | null)
      .find((a) => a && Object.keys(a).length > 0) ?? null

  const result = await callAnthropic(apiKey, {
    model: 'claude-opus-4-8',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: OUTPUT_JSON_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: buildPrompt({
          anonymousId: patient.anonymousId,
          age: patient.dateOfBirth ? ageFrom(patient.dateOfBirth) : null,
          sessionBlock: buildSessionBlock(sessionInputs),
          intakeBlock: buildIntakeBlock(latestIntake),
          sessionCount: completed.length,
        }),
      },
    ],
  })

  if (!result.ok) return { ok: false, reason: `model-error:${result.status}` }
  if (result.data.stop_reason === 'refusal') return { ok: false, reason: 'refusal' }

  const text = result.data.content?.find(
    (b: { type: string }) => b.type === 'text',
  )?.text
  let summary: PatientSummary
  try {
    if (!text) throw new Error('empty response')
    summary = SummarySchema.parse(JSON.parse(text))
  } catch {
    return { ok: false, reason: 'malformed-output' }
  }

  await prisma.patient.update({
    where: { id: patient.id },
    data: {
      summary,
      summaryGeneratedAt: new Date(),
      summarySessionCount: completed.length,
    },
  })

  return { ok: true, summary, sessionCount: completed.length }
}
