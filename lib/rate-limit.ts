/**
 * Sliding-window rate limiter, in memory. State is per server instance, so on
 * serverless this is best-effort only — good enough to stop a runaway UI or a
 * single user hammering the AI endpoints. Swap for a shared store (Redis,
 * Upstash) if the app ever runs on many instances and this must be strict.
 */

type WindowState = { timestamps: number[] }

const buckets = new Map<string, WindowState>()

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const state = buckets.get(key) ?? { timestamps: [] }
  state.timestamps = state.timestamps.filter(t => now - t < windowMs)

  if (state.timestamps.length >= limit) {
    const oldest = state.timestamps[0]
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    buckets.set(key, state)
    return { allowed: false, retryAfterSeconds }
  }

  state.timestamps.push(now)
  buckets.set(key, state)
  return { allowed: true }
}

/** Test-only helper. */
export function resetRateLimits(): void {
  buckets.clear()
}
