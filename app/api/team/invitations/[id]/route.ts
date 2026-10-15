import { NextResponse } from 'next/server'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import { revokeInvitation } from '@/lib/invitations'

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  const result = await revokeInvitation(params.id, {
    userId: ctx.userId,
    practiceId: ctx.practiceId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
