import { NextRequest, NextResponse } from 'next/server'
import { unscopedDb as prisma } from '@/lib/db'
import { isTokenExpired } from '@/lib/token'

/**
 * The fill link is session-level: one token opens every questionnaire attached
 * to that session. The link stays valid while at least one is still pending
 * and the token has not expired.
 */
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const clinicalSession = await prisma.clinicalSession.findUnique({
    where: { token: params.token },
    include: {
      patient: { select: { fullName: true, email: true } },
      questionnaires: {
        include: {
          scale: {
            include: {
              items: {
                orderBy: { order: 'asc' },
                include: { options: { orderBy: { order: 'asc' } } },
              },
              thresholds: { orderBy: { minScore: 'asc' } },
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!clinicalSession) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (isTokenExpired(clinicalSession.tokenExpiresAt)) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 })
  }

  const pending = clinicalSession.questionnaires.filter((q) => q.status === 'PENDING')
  if (pending.length === 0) {
    return NextResponse.json({ error: 'Link already used' }, { status: 410 })
  }

  return NextResponse.json({
    sessionId: clinicalSession.id,
    sessionTitle: clinicalSession.title,
    collectDetails: clinicalSession.collectDetails,
    patientHasDetails: Boolean(
      clinicalSession.patient.fullName && clinicalSession.patient.email,
    ),
    completedCount: clinicalSession.questionnaires.length - pending.length,
    totalCount: clinicalSession.questionnaires.length,
    questionnaires: pending.map((q) => ({
      id: q.id,
      order: q.order,
      scale: q.scale,
    })),
  })
}
