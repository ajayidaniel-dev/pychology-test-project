// lib/practice.ts
//
// Practice constants and types shared by client and server.
//
// These live apart from `lib/session-context.ts` on purpose: that module reads
// `next/headers`, which makes it server-only, and importing it from a client
// component fails the build. The switcher and the provider need the cookie name
// and the option shape but none of the resolution logic, so the shared pieces
// sit here where both sides can reach them.

import type { MembershipRole } from '@prisma/client'

/** Header the middleware writes the URL's practice slug into. */
export const PRACTICE_SLUG_HEADER = 'x-practice-slug'

/**
 * Cookie remembering the last practice used, for routes that carry no slug.
 *
 * Non-authoritative. It is a preference, not a grant: access is always
 * re-derived from membership on the server, so a tampered value selects
 * nothing the user could not already reach.
 */
export const PRACTICE_COOKIE = 'apas_practice'

/** One entry in the practice switcher. */
export type PracticeOption = {
  practiceId: string
  slug: string
  name: string
  role: MembershipRole
}
