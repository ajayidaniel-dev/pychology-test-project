import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeAlerts } from '@/lib/alert-rules'
import { scaleNameToEnum } from '@/lib/patient-summary'
import { buildItemLines, buildHistoryBlock, callAnthropic, ASSESSMENT_DATA_RULE } from '@/lib/anthropic'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const BodySchema = z.object({
  patientId: z.string().min(1),
  sessionId: z.string().min(1),
  regenerate: z.boolean().optional(),
})

export type ClinicalNarrative = {
  overallSeverity: string
  itemPatterns: string
  trend?: string
  safety: string
  safetyConcern: boolean
  followUpPriority: 'routine' | 'priority' | 'urgent'
  followUpRationale: string
}

const NarrativeSchema = z.object({
  overallSeverity: z.string(),
  itemPatterns: z.string(),
  trend: z.string().optional(),
  safety: z.string(),
  safetyConcern: z.boolean(),
  followUpPriority: z.enum(['routine', 'priority', 'urgent']),
  followUpRationale: z.string(),
})

const OUTPUT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overallSeverity: {
      type: 'string',
      description:
        'One or two sentences on overall severity, referencing the total score and severity band.',
    },
    itemPatterns: {
      type: 'string',
      description:
        'Two or three sentences on the most clinically significant item-level patterns.',
    },
    trend: {
      type: 'string',
      description:
        'One or two sentences on the score trajectory across administrations of this scale. Empty string if this is the first administration.',
    },
    safety: {
      type: 'string',
      description:
        'One or two sentences on safety-relevant endorsements. If suicidal ideation is endorsed, this must be the first clinical priority.',
    },
    safetyConcern: {
      type: 'boolean',
      description: 'True if any safety-relevant item is endorsed above zero.',
    },
    followUpPriority: {
      type: 'string',
      enum: ['routine', 'priority', 'urgent'],
    },
    followUpRationale: {
      type: 'string',
      description: 'One sentence justifying the follow-up priority.',
    },
  },
  required: [
    'overallSeverity',
    'itemPatterns',
    'trend',
    'safety',
    'safetyConcern',
    'followUpPriority',
    'followUpRationale',
  ],
  additionalProperties: false,
} as const

function buildPrompt(input: {
  scaleName: string
  totalScore: number
  severity: string
  itemLines: string
  historyBlock: string
  suicidalIdeation: boolean
}): string {
  return `You are a clinical psychologist assistant providing a structured clinical summary for a clinician's review. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language. You have no identifying information about this person. ${ASSESSMENT_DATA_RULE}

<assessment_data>
Scale: ${input.scaleName}
Total score: ${input.totalScore} — Severity: ${input.severity}
Item scores:
${input.itemLines}
${input.historyBlock}</assessment_data>
${input.suicidalIdeation ? 'NOTE: Suicidal ideation item is endorsed above zero. This must be flagged as the first clinical priority.' : ''}
${input.historyBlock ? 'Comment on the score trajectory across administrations in the trend field.' : 'This is the first administration; return an empty string for the trend field.'}
Produce the structured clinical summary.`
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { patientId, sessionId, regenerate } = parsed.data

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: sessionId,
      patientId,
      psychologistId: session.user.id,
    },
    include: {
      response: true,
      scale: { include: { items: { orderBy: { order: 'asc' } } } },
    },
  })

  if (!assessmentSession?.response) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Return the stored narrative unless a regeneration is requested
  if (assessmentSession.response.narrative && !regenerate) {
    return NextResponse.json({
      narrative: assessmentSession.response.narrative,
      generatedAt: assessmentSession.response.narrativeGeneratedAt,
      cached: true,
    })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 500 })
  }

  const rate = checkRateLimit(`narrative:${session.user.id}`, 5, 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many summary requests. Wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const itemScores = assessmentSession.response.itemScores as Record<string, number>
  const itemLabels = Object.fromEntries(
    assessmentSession.scale.items.map((item) => [String(item.order), item.text]),
  )
  const alerts = computeAlerts(
    scaleNameToEnum(assessmentSession.scale.name),
    assessmentSession.response.totalScore,
    itemScores,
    assessmentSession.response.severity,
  )
  const itemLines = buildItemLines(itemScores, itemLabels)

  const priorSessions = await prisma.assessmentSession.findMany({
    where: {
      patientId,
      scaleId: assessmentSession.scaleId,
      status: 'COMPLETED',
      id: { not: assessmentSession.id },
      response: { isNot: null },
    },
    include: { response: { select: { totalScore: true, severity: true, completedAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })
  const history = priorSessions
    .map((s) => s.response!)
    .filter((r) => r.completedAt < assessmentSession.response!.completedAt)
    .reverse()
  const historyBlock = buildHistoryBlock(history)

  const result = await callAnthropic(apiKey, {
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    output_config: {
      format: { type: 'json_schema', schema: OUTPUT_JSON_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: buildPrompt({
          scaleName: assessmentSession.scale.name,
          totalScore: assessmentSession.response.totalScore,
          severity: assessmentSession.response.severity,
          itemLines,
          historyBlock,
          suicidalIdeation: alerts.suicidalIdeation,
        }),
      },
    ],
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const data = result.data

  if (data.stop_reason === 'refusal') {
    return NextResponse.json({ error: 'The model declined to generate this summary.' }, { status: 502 })
  }

  const text = data.content?.find(
    (b: { type: string }) => b.type === 'text',
  )?.text
  let narrative: ClinicalNarrative
  try {
    if (!text) throw new Error('empty response')
    narrative = NarrativeSchema.parse(JSON.parse(text))
  } catch {
    return NextResponse.json({ error: 'Malformed summary from model. Try again.' }, { status: 502 })
  }

  const generatedAt = new Date()
  await prisma.questionnaireResponse.update({
    where: { sessionId },
    data: { narrative, narrativeGeneratedAt: generatedAt },
  })

  return NextResponse.json({ narrative, generatedAt, cached: false })
}
