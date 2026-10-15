import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import {
  acceptReferral,
  completeReferral,
  declineReferral,
  sendReferral,
  startReferral,
} from '@/lib/referrals'

const ActionSchema = z.object({
  action: z.enum(['send', 'accept', 'decline', 'start', 'complete']),
  summary: z.string().trim().max(5000).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageReferrals')
  if (denied) return denied

  const parsed = ActionSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const base = {
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    referralId: params.id,
  }

  let result: { ok: true } | { ok: false; error: string; status: number }

  switch (parsed.data.action) {
    case 'send':
      result = await sendReferral(base)
      break
    case 'accept':
      result = await acceptReferral(base)
      break
    case 'decline':
      result = await declineReferral(base)
      break
    case 'start':
      result = await startReferral(base)
      break
    case 'complete':
      result = await completeReferral({
        ...base,
        summary: parsed.data.summary ?? '',
      })
      break
  }

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
