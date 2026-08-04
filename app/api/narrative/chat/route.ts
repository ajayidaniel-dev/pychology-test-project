import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import { computeAlerts } from '@/lib/alert-rules'
import { scaleNameToEnum } from '@/lib/patient-summary'
import { buildItemLines, buildHistoryBlock, callAnthropic, ASSESSMENT_DATA_RULE } from '@/lib/anthropic'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const BodySchema = z.object({
  patientId: z.string().min(1),
  questionnaireId: z.string().min(1),
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
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const denied = forbiddenUnless(ctx.role, 'viewScores')
  if (denied) return denied
  const db = scopedDb(ctx)

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { patientId, questionnaireId, messages } = parsed.data

  if (messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Last message must be from the user' }, { status: 400 })
  }

  const questionnaire = await db.questionnaire.findFirst({
    where: {
      id: questionnaireId,
      session: { patientId, psychologistId: ctx.userId },
    },
    include: {
      response: true,
      scale: { include: { items: { orderBy: { order: 'asc' } } } },
    },
  })

  if (!questionnaire?.response) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 500 })
  }

  const rate = checkRateLimit(`narrative-chat:${ctx.userId}`, 10, 60_000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many questions in a short time. Wait a moment and try again.' },
      { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
    )
  }

  const itemScores = questionnaire.response.itemScores as Record<string, number>
  const itemLabels = Object.fromEntries(
    questionnaire.scale.items.map((item) => [String(item.order), item.text]),
  )
  const alerts = computeAlerts(
    scaleNameToEnum(questionnaire.scale.name),
    questionnaire.response.totalScore,
    itemScores,
    questionnaire.response.severity,
  )
  const itemLines = buildItemLines(itemScores, itemLabels)

  const prior = await db.questionnaire.findMany({
    where: {
      session: { patientId },
      scaleId: questionnaire.scaleId,
      status: 'COMPLETED',
      id: { not: questionnaire.id },
      response: { isNot: null },
    },
    include: { response: { select: { totalScore: true, severity: true, completedAt: true } } },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })
  const history = prior
    .map((s) => s.response!)
    .filter((r) => r.completedAt < questionnaire.response!.completedAt)
    .reverse()
  const historyBlock = buildHistoryBlock(history)

  const storedNarrative = questionnaire.response.narrative
    ? `\n\nAI clinical summary previously generated for this assessment:\n${JSON.stringify(questionnaire.response.narrative, null, 2)}`
    : ''

  const system = `You are a clinical psychologist assistant answering follow-up questions from a licensed clinician about one completed self-report assessment. You have no identifying information about the participant. ${ASSESSMENT_DATA_RULE}

<assessment_data>
Scale: ${questionnaire.scale.name}
Total score: ${questionnaire.response.totalScore} — Severity: ${questionnaire.response.severity}
Item scores:
${itemLines}
${historyBlock}</assessment_data>
${alerts.suicidalIdeation ? '\nNOTE: The suicidal ideation item is endorsed above zero. Treat safety as the first clinical priority in any relevant answer.' : ''}${storedNarrative}

Rules:
- Answer only questions about this assessment, its scale, its scores, or general psychometric interpretation relevant to it. If asked about anything else, briefly decline and redirect to the assessment.
- Do not make a diagnosis. Frame interpretations as hypotheses for the clinician to evaluate.
- Do not address or produce content for the participant directly.
- If a question touches on suicidality or safety, remind the clinician to verify against the raw item scores and their own safety protocol.
- Be concise: 2-5 sentences unless the question genuinely requires more.`

  const result = await callAnthropic(apiKey, {
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system,
    messages,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const data = result.data

  if (data.stop_reason === 'refusal') {
    return NextResponse.json({ error: 'The model declined to answer this question.' }, { status: 502 })
  }

  const text = data.content?.find((b: { type: string }) => b.type === 'text')?.text
  if (!text) {
    return NextResponse.json({ error: 'Empty response from model. Try again.' }, { status: 502 })
  }

  return NextResponse.json({ reply: text })
}
