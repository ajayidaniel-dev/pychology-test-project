import { NextResponse } from 'next/server'
import { getUserContext, unauthorized } from '@/lib/session-context'
import {
  acceptInvitation,
  invitationAcceptedPath,
} from '@/lib/invitations'

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const user = await getUserContext()
  if (!user) return unauthorized()

  const result = await acceptInvitation(params.token, user)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    practiceSlug: result.practiceSlug,
    practiceName: result.practiceName,
    href: invitationAcceptedPath(result.practiceSlug),
    created: result.created,
  })
}
