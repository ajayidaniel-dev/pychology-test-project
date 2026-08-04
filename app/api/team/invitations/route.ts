import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { isAssignableRole } from '@/lib/roles'
import { forbiddenUnless } from '@/lib/roles-http'
import {
  createInvitation,
  expireStaleInvitations,
} from '@/lib/invitations'

const CreateSchema = z.object({
  email: z.string().email().max(320),
  role: z.string(),
  areaIds: z.array(z.string().min(1)).max(50).optional(),
})

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  await expireStaleInvitations(ctx.practiceId)
  const db = scopedDb(ctx)

  const invitations = await db.practiceInvitation.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ invitations })
}

export async function POST(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  const parsed = CreateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }
  if (!isAssignableRole(parsed.data.role)) {
    return NextResponse.json(
      { error: 'That role cannot be assigned by invitation.' },
      { status: 400 },
    )
  }

  const origin =
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin

  const result = await createInvitation({
    practiceId: ctx.practiceId,
    practiceName: ctx.practiceName,
    practiceSlug: ctx.practiceSlug,
    practiceStatus: ctx.practiceStatus,
    email: parsed.data.email,
    role: parsed.data.role,
    areaIds: parsed.data.areaIds,
    invitedById: ctx.userId,
    origin,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    {
      invitation: {
        id: result.invitation.id,
        email: result.invitation.email,
        role: result.invitation.role,
        status: result.invitation.status,
        expiresAt: result.invitation.expiresAt,
        createdAt: result.invitation.createdAt,
      },
      existingUser: result.existingUser,
    },
    { status: 201 },
  )
}
