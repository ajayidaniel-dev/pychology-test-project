import { NextResponse } from 'next/server'
import { getUserContext, unauthorized } from '@/lib/session-context'
import { declineInvitation } from '@/lib/invitations'

export async function POST(
  _req: Request,
  { params }: { params: { token: string } },
) {
  const user = await getUserContext()
  if (!user) return unauthorized()

  const result = await declineInvitation(params.token, user)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
