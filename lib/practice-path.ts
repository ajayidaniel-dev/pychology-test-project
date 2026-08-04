// lib/practice-path.ts
//
// Every tenant-owned URL carries the practice: `/p/<slug>/patients/123`.
//
// The slug is in the path rather than only in the session so a link means the
// same thing for everyone who opens it. Someone in three practices can paste a
// URL into Slack without it resolving differently for the recipient, the back
// button behaves, and a URL that does not match the session is *detectable* —
// the app can say "that belongs to another practice" instead of 404ing or,
// worse, quietly showing the wrong record.

/** URL prefix for a practice. */
export function practiceRoot(slug: string): string {
  return `/p/${encodeURIComponent(slug)}`
}

/**
 * Build a practice-scoped path.
 *
 * `practicePath('renaissance', '/patients/123')` → `/p/renaissance/patients/123`
 *
 * Already-prefixed paths pass through unchanged, so this is safe to apply to a
 * value that may or may not have been through it already.
 */
export function practicePath(slug: string, path: string): string {
  if (path.startsWith(`/p/`)) return path
  // Account-level destinations belong to the human, not a practice. Guarding
  // here rather than at each call site means a caller can pass any internal
  // path without first working out which kind it is.
  if (isAccountPath(path)) return path
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${practiceRoot(slug)}${suffix}`
}

/** Paths that belong to the human rather than any practice, so never prefixed. */
const ACCOUNT_PATHS = [
  '/account',
  '/auth',
  '/legal',
  '/fill',
  '/no-practice',
  '/invitations',
  '/onboarding',
]

export function isAccountPath(path: string): boolean {
  return ACCOUNT_PATHS.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  )
}

/**
 * Strip the `/p/<slug>` prefix, returning the practice-relative path.
 */
export function stripPracticePrefix(path: string): string {
  const match = path.match(/^\/p\/[^/]+(\/.*)?$/)
  if (!match) return path
  return match[1] ?? '/dashboard'
}

/** Top-level sections inside a practice. */
export const PRACTICE_SECTIONS = [
  'dashboard',
  'patients',
  'batches',
  'scales',
  'team',
  'areas',
  'referrals',
  'settings',
  'billing',
]

/**
 * Where switching practice should land.
 *
 * Record ids do not survive the move — patient `abc` in one practice is not
 * patient `abc` in another — so carrying the full path across would reliably
 * 404. Keeping the *section* preserves what the user was doing ("I was looking
 * at patients") without pretending the record exists on the other side.
 */
export function equivalentSectionPath(currentPath: string): string {
  const relative = stripPracticePrefix(currentPath)
  const section = relative.split('/').filter(Boolean)[0]
  return section && PRACTICE_SECTIONS.includes(section)
    ? `/${section}`
    : '/dashboard'
}
