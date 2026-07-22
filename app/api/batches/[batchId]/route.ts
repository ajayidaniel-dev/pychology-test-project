import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { isTokenExpired } from '@/lib/token'
import { renewSessionLink } from '@/lib/session-links'
import { findOwnedBatch } from '@/lib/batches'

export async function GET(
  _req: NextRequest,
  { params }: { params: { batchId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batch = await findOwnedBatch(params.batchId, session.user.id)
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(batch)
}

const PatchBatchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  reason: z.string().trim().max(2000).nullable().optional(),
  /** Re-issues a token for every session in the batch whose link has lapsed. */
  renewExpiredLinks: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { batchId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.sessionBatch.findFirst({
    where: { id: params.batchId, psychologistId: session.user.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = PatchBatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { renewExpiredLinks, ...fields } = parsed.data

  if (Object.keys(fields).length > 0) {
    await prisma.sessionBatch.update({
      where: { id: params.batchId },
      data: fields,
    })
  }

  let renewedCount = 0
  if (renewExpiredLinks) {
    const sessions = await prisma.clinicalSession.findMany({
      where: { batchId: params.batchId },
      select: {
        id: true,
        tokenExpiresAt: true,
        questionnaires: { select: { status: true } },
      },
    })

    // Only lapsed links with unanswered questionnaires. Renewing a session the
    // patient already finished would hand out a live link for nothing.
    const stale = sessions.filter(
      (s) =>
        isTokenExpired(s.tokenExpiresAt) &&
        s.questionnaires.some((q) => q.status !== 'COMPLETED'),
    )

    await prisma.$transaction(async (tx) => {
      for (const staleSession of stale) {
        await renewSessionLink(tx, staleSession.id)
      }
    })
    renewedCount = stale.length
  }

  return NextResponse.json({ ok: true, renewedCount })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { batchId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.sessionBatch.findFirst({
    where: { id: params.batchId, psychologistId: session.user.id },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // SetNull on ClinicalSession.batchId: this dissolves the grouping only. The
  // sessions, responses and notes it produced are clinical records and stay.
  await prisma.sessionBatch.delete({ where: { id: params.batchId } })

  return NextResponse.json({ ok: true })
}
