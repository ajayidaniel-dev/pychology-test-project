import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { isAssignableRole } from '@/lib/roles'
import { forbiddenUnless } from '@/lib/roles-http'
import { changeMemberRole } from '@/lib/team'

const PatchSchema = z.object({
  role: z.string(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { membershipId: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  if (!isAssignableRole(parsed.data.role)) {
    return NextResponse.json(
      { error: 'That role cannot be assigned.' },
      { status: 400 },
    )
  }

  const result = await changeMemberRole({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    membershipId: params.membershipId,
    nextRole: parsed.data.role,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
