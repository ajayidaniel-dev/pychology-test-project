import { NextResponse } from 'next/server'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import { activatePractice } from '@/lib/practices'

export async function POST() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageBilling')
  if (denied) return denied

  const result = await activatePractice({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true, status: 'ACTIVE' })
}
