// lib/practice-path-server.ts
//
// Server-side counterpart to `usePracticeHref()`.
//
// Server components cannot use the client PracticeProvider, and threading a
// `practiceSlug` prop through every header, table and section signature would
// be a lot of churn for one value that the request already carries. The
// middleware puts the slug on a request header, so this reads it back.
//
// Only for components rendered inside `/p/<slug>/…`. Anywhere else the slug is
// absent and paths come back unprefixed, which is correct for account-level
// pages but means this is not a general-purpose link builder.

import { headers } from 'next/headers'
import { practicePath } from '@/lib/practice-path'
import { PRACTICE_SLUG_HEADER } from '@/lib/practice'

/** The active practice slug, or null outside a practice route. */
export function currentPracticeSlug(): string | null {
  return headers().get(PRACTICE_SLUG_HEADER)
}

/**
 * Build a practice-scoped path from a server component.
 *
 *   <Link href={practiceHref(`/patients/${id}`)}>
 */
export function practiceHref(path: string): string {
  const slug = currentPracticeSlug()
  return slug ? practicePath(slug, path) : path
}
