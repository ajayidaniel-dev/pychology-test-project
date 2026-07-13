import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildDatasourceUrl(): string {
  const base = process.env.DATABASE_URL
  if (!base) return ''
  try {
    const url = new URL(base)
    // Raise pool size and timeout — Next.js App Router dev spawns multiple
    // worker threads, each with their own module scope, which can exhaust
    // the default pool of 5 connections in seconds.
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '20')
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '30')
    return url.toString()
  } catch {
    return base
  }
}

function createPrismaClient() {
  return new PrismaClient({ datasourceUrl: buildDatasourceUrl() })
}

function getPrismaClient() {
  const existing = globalForPrisma.prisma
  // After `prisma generate`, hot reload can keep a stale singleton that is
  // missing newer model delegates until the process fully restarts.
  const hasNotificationPreference =
    existing &&
    typeof (existing as { notificationPreference?: { findMany?: unknown } })
      .notificationPreference?.findMany === 'function'

  if (existing && hasNotificationPreference) {
    return existing
  }

  if (existing) {
    void existing.$disconnect().catch(() => undefined)
  }

  const client = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client
  }
  return client
}

export const prisma = getPrismaClient()

export default prisma
