import { NextResponse } from 'next/server'
import { peekInvitation } from '@/lib/invitations'
import { ROLE_LABELS } from '@/lib/roles'

/**
 * Public peek of an invitation — practice name and role only.
 * Accept/decline require a session (sibling routes).
 */
export async function GET(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const invitation = await peekInvitation(params.token)
  if (!invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }

  return NextResponse.json({
    email: invitation.email,
    role: invitation.role,
    roleLabel: ROLE_LABELS[invitation.role],
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    practiceName: invitation.practiceName,
    practiceSlug: invitation.practiceSlug,
  })
}
