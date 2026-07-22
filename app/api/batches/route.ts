import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'
import { MAX_BATCH_PATIENTS } from '@/lib/batches'

const CreateBatchSchema = z.object({
  title: z.string().trim().min(1).max(120),
  reason: z.string().trim().max(2000).optional(),
  scheduledAt: z.coerce.date(),
  collectDetails: z.boolean().optional().default(false),
  patientIds: z.array(z.string()).min(1).max(MAX_BATCH_PATIENTS),
  scaleIds: z.array(z.string()).min(1).max(20),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateBatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { title, reason, scheduledAt, collectDetails, scaleIds } = parsed.data
  // Duplicate ids would silently create two sessions for the same patient.
  const patientIds = [...new Set(parsed.data.patientIds)]

  // Ownership is checked before anything is written: the ids arrive from the
  // client, so a caller could otherwise assign questionnaires to patients that
  // aren't theirs.
  const patients = await prisma.patient.findMany({
    where: { id: { in: patientIds }, psychologistId: session.user.id },
    select: { id: true },
  })
  if (patients.length !== patientIds.length) {
    return NextResponse.json({ error: 'Unknown patient' }, { status: 404 })
  }

  const scales = await prisma.scale.findMany({
    where: {
      id: { in: scaleIds },
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    select: { id: true },
  })
  if (scales.length !== new Set(scaleIds).size) {
    return NextResponse.json({ error: 'Unknown scale' }, { status: 404 })
  }

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.sessionBatch.create({
      data: {
        psychologistId: session.user.id,
        title,
        reason: reason || null,
        scheduledAt,
      },
    })

    // One session — and therefore one token — per patient. The token grants
    // access to a single patient's questionnaires, so it can never be shared
    // across the batch.
    for (const patientId of patientIds) {
      await tx.clinicalSession.create({
        data: {
          batchId: created.id,
          patientId,
          psychologistId: session.user.id,
          title,
          reason: reason || null,
          scheduledAt,
          collectDetails,
          token: generateToken(),
          tokenExpiresAt: tokenExpiresAt(),
          questionnaires: {
            create: scaleIds.map((scaleId, index) => ({
              scaleId,
              order: index + 1,
            })),
          },
        },
      })
    }

    return created
  })

  return NextResponse.json(batch, { status: 201 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const batches = await prisma.sessionBatch.findMany({
    where: { psychologistId: session.user.id },
    include: {
      sessions: {
        select: {
          id: true,
          tokenExpiresAt: true,
          questionnaires: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(batches)
}
