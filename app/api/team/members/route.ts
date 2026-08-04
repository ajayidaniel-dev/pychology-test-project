import { NextResponse } from 'next/server'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import { listMembers } from '@/lib/team'

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  const members = await listMembers(scopedDb(ctx), ctx.practiceId)
  return NextResponse.json({ members })
}
