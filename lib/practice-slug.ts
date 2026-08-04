// Client-safe slug helpers — no next/server or Prisma imports.

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugifyPracticeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function isValidPracticeSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 48 && SLUG_RE.test(slug)
}

/** Optional patient-facing line stored in Practice.settings.branding.tagline. */
export function brandingTaglineFromSettings(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object') return null
  const branding = (settings as { branding?: { tagline?: unknown } }).branding
  return typeof branding?.tagline === 'string' && branding.tagline.trim()
    ? branding.tagline.trim()
    : null
}
