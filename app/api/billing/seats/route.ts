import { NextResponse } from 'next/server'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { forbiddenUnless } from '@/lib/roles-http'
import { countActiveSeats } from '@/lib/practices'
import { scopedDb } from '@/lib/db'

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'manageBilling')
  if (denied) return denied

  const seats = await countActiveSeats(ctx.practiceId)
  const db = scopedDb(ctx)
  const members = await db.membership.findMany({
    where: { status: 'ACTIVE' },
    select: {
      role: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  return NextResponse.json({
    seats,
    // Placeholder plan until a payment provider is wired.
    plan: {
      name: 'Practice',
      seatUnit: 'active membership',
      priceLabel: 'Contact us to set pricing',
      checkoutAvailable: false,
    },
    members: members.map((m) => ({
      name: m.user.name,
      email: m.user.email,
      role: m.role,
    })),
  })
}
