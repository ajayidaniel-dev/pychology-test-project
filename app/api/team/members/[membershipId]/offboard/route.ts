import { NextResponse } from 'next/server'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import { offboardMember } from '@/lib/team'

export async function POST(
  _req: Request,
  { params }: { params: { membershipId: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  const result = await offboardMember({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    actorRole: ctx.role,
    membershipId: params.membershipId,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, patientCount: result.patientCount },
      { status: result.status },
    )
  }

  return NextResponse.json({ ok: true })
}
