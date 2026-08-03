// lib/session-context.ts
//
// The single place the app resolves "who is making this request".
//
// Every route handler and server component reads identity from here rather than
// calling getServerSession directly. That matters for the practice/tenancy work:
// when requests gain a practice context, this is the one file that has to learn
// about it, and every call site inherits it. See docs/tenancy-implementation-plan.md.

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { MembershipRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export type UserContext = {
  userId: string
  email: string | null
  name: string | null
}

/**
 * A user acting within a specific practice.
 *
 * Everything that writes tenant-owned data needs one of these, because
 * practiceId is NOT NULL on every owned table.
 */
export type PracticeContext = UserContext & {
  practiceId: string
  membershipId: string
  role: MembershipRole
}

/**
 * Resolve the current user, or null when signed out.
 *
 * Prefer `requireUser` in server components and the `unauthorized` guard in
 * route handlers. Reach for this directly only where being signed out is a
 * legitimate branch rather than a failure — the landing page, or metadata
 * generation that falls back to a generic title.
 */
export async function getUserContext(): Promise<UserContext | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  return {
    userId: session.user.id,
    email: session.user.email ?? null,
    name: session.user.name ?? null,
  }
}

/**
 * Server components and pages: resolve the current user or redirect to sign-in.
 * Never returns when signed out.
 */
export async function requireUser(): Promise<UserContext> {
  const context = await getUserContext()
  if (!context) redirect('/auth/signin')
  return context
}

/** Route handlers: the standard 401 for an unauthenticated request. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * Resolve the current user together with the practice they are acting in.
 *
 * Until the practice switcher ships (Phase 5) a practitioner has exactly one
 * active membership, so resolution is unambiguous. When several are possible
 * this is where the session's selected practice gets read, and it is the only
 * place that has to change.
 *
 * Returns null when signed out, and when signed in with no active membership —
 * a real state for an account created before it joins or creates a practice.
 * Callers distinguish the two with `unauthorized()` vs `noPractice()`; Phase 8
 * routes the second case to onboarding instead.
 */
export async function getPracticeContext(): Promise<PracticeContext | null> {
  const context = await getUserContext()
  if (!context) return null

  const membership = await prisma.membership.findFirst({
    where: { userId: context.userId, status: 'ACTIVE' },
    orderBy: { joinedAt: 'asc' },
    select: { id: true, practiceId: true, role: true },
  })
  if (!membership) return null

  return {
    ...context,
    practiceId: membership.practiceId,
    membershipId: membership.id,
    role: membership.role,
  }
}

/**
 * Server components and pages: resolve user + practice, or redirect to sign-in.
 * Never returns without a practice.
 */
export async function requirePracticeContext(): Promise<PracticeContext> {
  const context = await getPracticeContext()
  if (!context) redirect('/auth/signin')
  return context
}

/**
 * Route handlers: signed in, but not a member of any practice.
 *
 * Deliberately distinct from a 401 — the credentials are fine, there is just no
 * tenant to act within, and the fix is onboarding rather than signing in again.
 */
export function noPractice(): NextResponse {
  return NextResponse.json(
    { error: 'No active practice for this account' },
    { status: 403 },
  )
}

/**
 * The correct failure response when `getPracticeContext` returns null: 401 if
 * nobody is signed in, 403 if they are but belong to no practice.
 *
 * The second session read is a JWT decode, not a query.
 */
export async function practiceContextFailure(): Promise<NextResponse> {
  return (await getUserContext()) ? noPractice() : unauthorized()
}
