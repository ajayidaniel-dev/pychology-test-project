// lib/session-context.ts
//
// The single place the app resolves "who is making this request".
//
// Every route handler and server component reads identity from here rather than
// calling getServerSession directly. That matters for the practice/tenancy work:
// when requests gain a practice context, this is the one file that has to learn
// about it, and every call site inherits it. See docs/tenancy-implementation-plan.md.

import { getServerSession } from 'next-auth'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { MembershipRole } from '@prisma/client'
import {
  PRACTICE_COOKIE,
  PRACTICE_SLUG_HEADER,
  type PracticeOption,
} from '@/lib/practice'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export type UserContext = {
  userId: string
  email: string | null
  name: string | null
}

// Re-exported so server callers have one import for practice concerns. Client
// components must import these from @/lib/practice directly — this module
// reads next/headers and cannot be pulled into a client bundle.
export type { PracticeOption }
export { PRACTICE_COOKIE, PRACTICE_SLUG_HEADER }

/**
 * A user acting within a specific practice.
 *
 * Everything that writes tenant-owned data needs one of these, because
 * practiceId is NOT NULL on every owned table.
 */
export type PracticeContext = UserContext & {
  practiceId: string
  practiceSlug: string
  practiceName: string
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
 * Returns null when signed out, when the user has no active membership at all,
 * and when the URL names a practice they are not a member of. Callers
 * distinguish signed-out from practice-less with `practiceContextFailure()`.
 */
export async function getPracticeContext(): Promise<PracticeContext | null> {
  const context = await getUserContext()
  if (!context) return null

  // Resolution order, most explicit first:
  //   1. the slug in the URL — authoritative, because a link must mean the same
  //      thing for everyone who opens it
  //   2. the last-used cookie — for account-level pages that carry no slug
  //   3. the earliest membership — first sign-in, before either exists
  //
  // A slug the user has no ACTIVE membership for resolves to null rather than
  // silently falling back, so the caller can say "that belongs to another
  // practice" instead of quietly showing the wrong one.
  const urlSlug = headers().get(PRACTICE_SLUG_HEADER)
  const cookieSlug = cookies().get(PRACTICE_COOKIE)?.value

  const select = {
    id: true,
    practiceId: true,
    role: true,
    practice: { select: { slug: true, name: true } },
  }
  const base = { userId: context.userId, status: 'ACTIVE' as const }

  const bySlug = async (slug: string) =>
    prisma.membership.findFirst({
      where: { ...base, practice: { slug } },
      select,
    })

  let membership = urlSlug ? await bySlug(urlSlug) : null

  // A slug in the URL is a claim about which practice this page belongs to.
  // If the user has no active membership there, fall through to nothing — the
  // caller redirects rather than quietly rendering a different practice under
  // the requested URL.
  if (!membership && !urlSlug) {
    membership =
      (cookieSlug ? await bySlug(cookieSlug) : null) ??
      (await prisma.membership.findFirst({
        where: base,
        orderBy: { joinedAt: 'asc' },
        select,
      }))
  }

  if (!membership) return null

  return {
    ...context,
    practiceId: membership.practiceId,
    practiceSlug: membership.practice.slug,
    practiceName: membership.practice.name,
    membershipId: membership.id,
    role: membership.role,
  }
}

/**
 * Every practice this user can act in — the switcher's contents.
 *
 * Ordered by name rather than join date: the switcher is a place to find a
 * known practice, not a history.
 */
export async function listPracticeOptions(
  userId: string,
): Promise<PracticeOption[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId, status: 'ACTIVE' },
    select: {
      practiceId: true,
      role: true,
      practice: { select: { slug: true, name: true } },
    },
    orderBy: { practice: { name: 'asc' } },
  })

  return memberships.map((m) => ({
    practiceId: m.practiceId,
    slug: m.practice.slug,
    name: m.practice.name,
    role: m.role,
  }))
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
