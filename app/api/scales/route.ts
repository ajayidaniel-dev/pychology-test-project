import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scales = await prisma.scale.findMany({
    where: {
      OR: [
        { isLibrary: true },
        { psychologistId: session.user.id },
      ],
    },
    include: {
      _count: { select: { items: true, questionnaires: true } },
    },
    orderBy: [{ isLibrary: 'desc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(scales)
}

const CreateScaleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreateScaleSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const scale = await prisma.scale.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      psychologistId: session.user.id,
      isLibrary: false,
    },
  })

  return NextResponse.json(scale, { status: 201 })
}
