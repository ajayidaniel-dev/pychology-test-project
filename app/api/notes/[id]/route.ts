import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const PatchNoteSchema = z.object({
  body: z.string().trim().min(1).max(10000),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.note.findFirst({
    where: { id: params.id, patient: { psychologistId: session.user.id } },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = PatchNoteSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const note = await prisma.note.update({
    where: { id: params.id },
    data: { body: parsed.data.body },
    include: {
      session: { select: { id: true, title: true } },
      questionnaire: {
        select: { id: true, sessionId: true, scale: { select: { name: true } } },
      },
    },
  })

  return NextResponse.json(note)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const existing = await prisma.note.findFirst({
    where: { id: params.id, patient: { psychologistId: session.user.id } },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.note.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true })
}
