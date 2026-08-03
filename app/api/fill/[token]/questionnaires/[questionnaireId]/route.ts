import { NextRequest, NextResponse } from 'next/server'
import { unscopedDb as prisma } from '@/lib/db'
import { isTokenExpired } from '@/lib/token'
import { Prisma } from '@prisma/client'
import { computeNumericScore, lookupSeverity, validateItemScores } from '@/lib/scale-scoring'
import { createQuestionnaireSubmitNotifications } from '@/lib/notifications'
import { generateAndStorePatientSummary } from '@/lib/patient-summary-ai'
import {
  CONSENT_POLICY_VERSION,
  IntakeSchema,
  PatientDetailsSchema,
} from '@/lib/consent'
import { z } from 'zod'

const SubmitSchema = z.object({
  itemScores: z.record(z.string(), z.union([z.number(), z.string()])),
  consent: z.literal(true),
  details: PatientDetailsSchema.optional(),
  intake: IntakeSchema.optional(),
})

/**
 * Submits one questionnaire within a session. Consent and patient details are
 * session-level and are stamped on the first submission only; every submission
 * scores its own questionnaire. The patient's AI summary is regenerated once
 * the last questionnaire in the session lands, not after each one.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { token: string; questionnaireId: string } },
) {
  const questionnaire = await prisma.questionnaire.findFirst({
    where: {
      id: params.questionnaireId,
      session: { token: params.token },
    },
    include: {
      session: {
        include: { patient: { select: { id: true, anonymousId: true } } },
      },
      scale: {
        include: {
          thresholds: { orderBy: { minScore: 'asc' } },
          items: { include: { options: true } },
        },
      },
    },
  })

  if (!questionnaire) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  const clinicalSession = questionnaire.session
  if (isTokenExpired(clinicalSession.tokenExpiresAt)) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }
  if (questionnaire.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
  }

  const parsed = SubmitSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { itemScores, details, intake } = parsed.data

  // Identity may only be stored on links the clinician explicitly enabled it for.
  if (details && !clinicalSession.collectDetails) {
    return NextResponse.json(
      { error: 'This link does not collect personal details' },
      { status: 400 },
    )
  }

  const validation = validateItemScores(questionnaire.scale.items, itemScores)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const totalScore = computeNumericScore(itemScores)
  const severity = lookupSeverity(totalScore, questionnaire.scale.thresholds)

  try {
    await prisma.$transaction([
      prisma.questionnaireResponse.create({
        data: {
          questionnaireId: questionnaire.id,
          itemScores,
          intakeAnswers: intake ?? undefined,
          totalScore,
          severity,
        },
      }),
      prisma.questionnaire.update({
        where: { id: questionnaire.id },
        data: { status: 'COMPLETED' },
      }),
      prisma.clinicalSession.update({
        where: { id: clinicalSession.id },
        data: {
          consentAt: clinicalSession.consentAt ?? new Date(),
          consentPolicyVersion:
            clinicalSession.consentPolicyVersion ?? CONSENT_POLICY_VERSION,
        },
      }),
      ...(details
        ? [
            prisma.patient.update({
              where: { id: clinicalSession.patientId },
              data: {
                fullName: details.fullName,
                email: details.email,
                phone: details.phone,
                dateOfBirth: details.dateOfBirth ?? undefined,
                detailsUpdatedAt: new Date(),
              },
            }),
          ]
        : []),
    ])
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
    }
    throw err
  }

  await createQuestionnaireSubmitNotifications({
    questionnaireId: questionnaire.id,
    sessionId: clinicalSession.id,
    // The patient fill flow is token-authenticated with no practice context of
    // its own — the practice comes from the session the token unlocked.
    practiceId: clinicalSession.practiceId,
    patientId: clinicalSession.patientId,
    psychologistId: clinicalSession.psychologistId,
    anonymousId: clinicalSession.patient.anonymousId,
    scaleName: questionnaire.scale.name,
    totalScore,
    itemScores: itemScores as Record<string, number>,
    storedSeverity: severity,
  })

  const remaining = await prisma.questionnaire.count({
    where: { sessionId: clinicalSession.id, status: 'PENDING' },
  })

  if (remaining === 0) {
    // The session is done — mark it and refresh the patient's cross-session AI
    // summary. Fire-and-forget: the patient's submission must not wait on a
    // ~15s model call, and a failure just means it retries on the next session.
    await prisma.clinicalSession.update({
      where: { id: clinicalSession.id },
      data: { status: 'COMPLETED' },
    })

    void generateAndStorePatientSummary(clinicalSession.patientId).then(
      (r) => {
        if (!r.ok) {
          console.warn(
            `[patient-summary] skipped for ${clinicalSession.patientId}: ${r.reason}`,
          )
        }
      },
      (err) => {
        console.error(
          `[patient-summary] failed for ${clinicalSession.patientId}:`,
          err,
        )
      },
    )
  }

  return NextResponse.json({ ok: true, remaining })
}
