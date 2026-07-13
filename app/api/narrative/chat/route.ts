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
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(20),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { patientId, sessionId, messages } = parsed.data

  if (messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Last message must be from the user' }, { status: 400 })
  }

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

  const storedNarrative = assessmentSession.response.narrative
    ? `\n\nAI clinical summary previously generated for this assessment:\n${JSON.stringify(assessmentSession.response.narrative, null, 2)}`
    : ''

  const system = `You are a clinical psychologist assistant answering follow-up questions from a licensed clinician about one completed self-report assessment. You have no identifying information about the participant.

Assessment context:
Scale: ${assessmentSession.scale.name}
Total score: ${assessmentSession.response.totalScore} — Severity: ${assessmentSession.response.severity}
Item scores:
${itemLines}
${alerts.suicidalIdeation ? '\nNOTE: The suicidal ideation item is endorsed above zero. Treat safety as the first clinical priority in any relevant answer.' : ''}${storedNarrative}

Rules:
- Answer only questions about this assessment, its scale, its scores, or general psychometric interpretation relevant to it. If asked about anything else, briefly decline and redirect to the assessment.
- Do not make a diagnosis. Frame interpretations as hypotheses for the clinician to evaluate.
- Do not address or produce content for the participant directly.
- If a question touches on suicidality or safety, remind the clinician to verify against the raw item scores and their own safety protocol.
- Be concise: 2-5 sentences unless the question genuinely requires more.`

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
      system,
      messages,
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
    return NextResponse.json({ error: 'The model declined to answer this question.' }, { status: 502 })
  }

  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text
  if (!text) {
    return NextResponse.json({ error: 'Empty response from model. Try again.' }, { status: 502 })
  }

  return NextResponse.json({ reply: text })
}
