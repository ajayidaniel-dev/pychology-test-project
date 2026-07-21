import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { nextAnonymousId } from '@/lib/anonymous-id'
import {
  PATIENT_QUESTIONNAIRES_INCLUDE,
  flattenQuestionnaires,
} from '@/lib/patient-summary'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: PATIENT_QUESTIONNAIRES_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    patients.map((p) => ({
      ...p,
      questionnaires: flattenQuestionnaires(p.clinicalSessions),
    })),
  )
}

const CreatePatientSchema = z.object({
  displayName: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const patient = await prisma.$transaction(async (tx) => {
    const count = await tx.patient.count({
      where: { psychologistId: session.user.id },
    })
    return tx.patient.create({
      data: {
        displayName: parsed.data.displayName,
        anonymousId: nextAnonymousId(count),
        psychologistId: session.user.id,
      },
    })
  }, { isolationLevel: 'Serializable' })

  return NextResponse.json(patient, { status: 201 })
}
