import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('allows requests under the limit', () => {
    expect(checkRateLimit('u1', 3, 60_000).allowed).toBe(true)
    expect(checkRateLimit('u1', 3, 60_000).allowed).toBe(true)
    expect(checkRateLimit('u1', 3, 60_000).allowed).toBe(true)
  })

  it('blocks the request over the limit with a retry-after', () => {
    checkRateLimit('u1', 2, 60_000)
    checkRateLimit('u1', 2, 60_000)
    const result = checkRateLimit('u1', 2, 60_000)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1)
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60)
    }
  })

  it('tracks keys independently', () => {
    checkRateLimit('u1', 1, 60_000)
    expect(checkRateLimit('u1', 1, 60_000).allowed).toBe(false)
    expect(checkRateLimit('u2', 1, 60_000).allowed).toBe(true)
  })

  it('allows again after the window passes', () => {
    checkRateLimit('u1', 1, 60_000)
    expect(checkRateLimit('u1', 1, 60_000).allowed).toBe(false)
    jest.advanceTimersByTime(60_001)
    expect(checkRateLimit('u1', 1, 60_000).allowed).toBe(true)
  })
})
