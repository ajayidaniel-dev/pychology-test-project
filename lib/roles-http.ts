// Server-only role guards that return HTTP responses.

import { NextResponse } from 'next/server'
import type { MembershipRole } from '@prisma/client'
import { can, type Capability } from '@/lib/roles'

/**
 * Route handlers: 403 unless the role holds the capability.
 * Returns null when permitted so callers can early-return the response.
 */
export function forbiddenUnless(
  role: MembershipRole,
  capability: Capability,
): NextResponse | null {
  if (can(role, capability)) return null
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
