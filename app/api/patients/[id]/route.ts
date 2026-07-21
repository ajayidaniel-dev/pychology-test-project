import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    include: {
      clinicalSessions: {
        include: {
          questionnaires: {
            include: { response: true, scale: { select: { id: true, name: true } } },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { scheduledAt: 'asc' },
      },
    },
  })

  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(patient)
}

const UpdatePatientSchema = z.object({
  displayName: z.string().min(1),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.patient.update({
    where: { id: params.id },
    data: { displayName: parsed.data.displayName },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.patient.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
