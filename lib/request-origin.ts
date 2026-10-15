import type { NextRequest } from 'next/server'

/**
 * Prefer the host the request actually came in on; behind a proxy that is the
 * forwarded host. NEXTAUTH_URL is only a last resort.
 */
export function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  return host ? `${proto}://${host}` : (process.env.NEXTAUTH_URL ?? req.nextUrl.origin)
}

export function fillUrlFor(req: NextRequest, token: string): string {
  return `${requestOrigin(req)}/fill/${token}`
}
