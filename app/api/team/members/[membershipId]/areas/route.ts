import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import { setMembershipAreas } from '@/lib/areas'

const BodySchema = z.object({
  areaIds: z.array(z.string().min(1)).max(50),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: { membershipId: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageTeam')
  if (denied) return denied

  const parsed = BodySchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const result = await setMembershipAreas({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    membershipId: params.membershipId,
    areaIds: parsed.data.areaIds,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
