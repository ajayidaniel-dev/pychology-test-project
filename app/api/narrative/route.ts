import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeAlerts } from '@/lib/alert-rules'
import { scaleNameToEnum } from '@/lib/patient-summary'
import { z } from 'zod'

const BodySchema = z.object({
  patientId: z.string().min(1),
  sessionId: z.string().min(1),
  regenerate: z.boolean().optional(),
})

export type ClinicalNarrative = {
  overallSeverity: string
  itemPatterns: string
  safety: string
  safetyConcern: boolean
  followUpPriority: 'routine' | 'priority' | 'urgent'
  followUpRationale: string
}

const NarrativeSchema = z.object({
  overallSeverity: z.string(),
  itemPatterns: z.string(),
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
  suicidalIdeation: boolean
}): string {
  return `You are a clinical psychologist assistant providing a structured clinical summary for a clinician's review. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language. You have no identifying information about this person.

Scale: ${input.scaleName}
Total score: ${input.totalScore} — Severity: ${input.severity}
Item scores:
${input.itemLines}
${input.suicidalIdeation ? 'NOTE: Suicidal ideation item is endorsed above zero. This must be flagged as the first clinical priority.' : ''}

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
  const itemLines = Object.entries(itemScores)
    .map(([k, v]) => `- ${itemLabels[k] ?? `Item ${k}`}: ${v}`)
    .join('\n')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
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
            suicidalIdeation: alerts.suicidalIdeation,
          }),
        },
      ],
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    return NextResponse.json(
      { error: data.error?.message ?? 'Claude API error' },
      { status: response.status },
    )
  }

  if (data.stop_reason === 'refusal') {
    return NextResponse.json({ error: 'The model declined to generate this summary.' }, { status: 502 })
  }

  const text = data.content?.find(
    (b: { type: string }) => b.type === 'text',
  )?.text
  let narrative: ClinicalNarrative
  try {
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
