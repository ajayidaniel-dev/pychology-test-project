#!/usr/bin/env node
// scripts/verify-rls.mjs
//
// Proves the row-level-security policies actually work.
//
// They cannot be tested through the normal connection: the app connects as
// `neondb_owner`, which has BYPASSRLS, so every policy is ignored and every
// check would pass vacuously. This script creates a temporary unprivileged
// role, connects as it, exercises the policies, and drops the role again.
//
// Run it after changing anything in the RLS migration.
//
// Usage: node scripts/verify-rls.mjs

import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

// Prisma reads .env for its own client, but this script builds a second
// connection string by hand and so needs the value itself. The project has no
// dotenv dependency, and this is not worth adding one for.
if (!process.env.DATABASE_URL) {
  const line = readFileSync('.env', 'utf8')
    .split('\n')
    .find((l) => l.startsWith('DATABASE_URL='))
  if (line) process.env.DATABASE_URL = line.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '')
}

const admin = new PrismaClient()
const ROLE = 'rls_verify_probe'
const PASSWORD = randomBytes(18).toString('hex')

/** practiceId is NOT NULL: with no practice set, nothing at all is visible. */
const STRICT_TABLES = [
  'Patient',
  'ClinicalSession',
  'SessionBatch',
  'Questionnaire',
  'Note',
  'Area',
  'Membership',
  'PracticeInvitation',
  'AuditEntry',
  'Practice',
]

/**
 * practiceId is nullable. With no practice set these correctly still expose
 * their practice-less rows — the global scale library, and account-level
 * notifications — because those belong to no tenant. What must never be
 * visible is a row that *does* belong to a practice.
 */
const NULLABLE_TENANT_TABLES = ['Scale', 'Notification']

function probeUrl() {
  const url = new URL(process.env.DATABASE_URL)
  url.username = ROLE
  url.password = PASSWORD
  return url.toString()
}

const results = []
function check(label, ok, detail = '') {
  results.push(ok)
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  — ${detail}` : ''}`)
}

async function main() {
  console.log('Creating unprivileged probe role...\n')

  await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS ${ROLE}`)
  await admin.$executeRawUnsafe(
    `CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASSWORD}' NOBYPASSRLS`,
  )
  await admin.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO ${ROLE}`)
  await admin.$executeRawUnsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE}`,
  )

  // Two practices with a patient each, so isolation is observable.
  const [a, b] = await Promise.all([
    admin.practice.findFirstOrThrow({ where: { slug: 'renaissance' } }),
    admin.practice.upsert({
      where: { slug: '__rlsprobe__' },
      update: {},
      create: { name: 'RLS Probe Other', slug: '__rlsprobe__', status: 'ACTIVE' },
    }),
  ])
  const owner = await admin.membership.findFirstOrThrow({
    where: { practiceId: a.id },
  })
  await admin.patient.upsert({
    where: { practiceId_anonymousId: { practiceId: b.id, anonymousId: 'P-950' } },
    update: {},
    create: {
      practiceId: b.id,
      psychologistId: owner.userId,
      displayName: 'Other Practice Patient',
      anonymousId: 'P-950',
    },
  })

  const probe = new PrismaClient({ datasources: { db: { url: probeUrl() } } })

  try {
    const asRole = await probe.$queryRawUnsafe('SELECT current_user')
    check('probe connects as the unprivileged role', asRole[0].current_user === ROLE, asRole[0].current_user)

    // 1. Deny by default — no app.practice_id set at all.
    console.log('\nWithout app.practice_id (the forgot-to-set case):')
    for (const table of STRICT_TABLES) {
      const rows = await probe.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${table}"`)
      check(`${table} returns 0 rows`, rows[0].n === 0, `${rows[0].n} rows`)
    }
    for (const table of NULLABLE_TENANT_TABLES) {
      const owned = await probe.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM "${table}" WHERE "practiceId" IS NOT NULL`,
      )
      check(`${table} exposes no practice-owned rows`, owned[0].n === 0, `${owned[0].n} rows`)
    }

    // 2. With the practice set, only that practice is visible.
    console.log('\nWith app.practice_id set to practice A:')
    await probe.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.practice_id', $1, true)`, a.id)

      const patients = await tx.$queryRawUnsafe(
        'SELECT "practiceId", count(*)::int AS n FROM "Patient" GROUP BY 1',
      )
      const foreign = patients.filter((r) => r.practiceId !== a.id)
      check('only practice A patients visible', foreign.length === 0, `${foreign.length} foreign groups`)
      check('practice A patients are visible', patients.length === 1 && patients[0].n > 0)

      const practices = await tx.$queryRawUnsafe('SELECT count(*)::int AS n FROM "Practice"')
      check('exactly one Practice row visible', practices[0].n === 1, `${practices[0].n} rows`)

      // Global library scales carry no practice and must stay readable.
      const library = await tx.$queryRawUnsafe(
        'SELECT count(*)::int AS n FROM "Scale" WHERE "practiceId" IS NULL',
      )
      check('global library scales still readable', library[0].n > 0, `${library[0].n} scales`)
    })

    // 3. Writes cannot cross the boundary.
    console.log('\nWrites under practice A:')
    await probe.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.practice_id', $1, true)`, a.id)

      const updated = await tx.$executeRawUnsafe(
        `UPDATE "Patient" SET "displayName" = 'HIJACKED' WHERE "practiceId" = $1`,
        b.id,
      )
      check('cannot update another practice\'s rows', updated === 0, `${updated} rows affected`)

      try {
        await tx.$executeRawUnsafe(
          `INSERT INTO "Patient" ("id","practiceId","psychologistId","displayName","anonymousId","createdAt")
           VALUES ($1,$2,$3,'Smuggled','P-951',now())`,
          `rlsprobe-${Date.now()}`,
          b.id,
          owner.userId,
        )
        check('cannot insert into another practice', false, 'insert succeeded')
      } catch (e) {
        check(
          'cannot insert into another practice',
          /row-level security/i.test(e.message),
          'blocked by WITH CHECK',
        )
      }
    })

    const untouched = await admin.patient.findFirstOrThrow({
      where: { practiceId: b.id, anonymousId: 'P-950' },
    })
    check('other practice row genuinely unmodified', untouched.displayName === 'Other Practice Patient')
  } finally {
    await probe.$disconnect()
    console.log('\nCleaning up...')
    await admin.practice.deleteMany({ where: { slug: '__rlsprobe__' } })
    await admin.$executeRawUnsafe(
      `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${ROLE}`,
    )
    await admin.$executeRawUnsafe(`REVOKE USAGE ON SCHEMA public FROM ${ROLE}`)
    await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS ${ROLE}`)
    await admin.$disconnect()
  }

  const failed = results.filter((r) => !r).length
  console.log(
    failed === 0
      ? `\n✓ all ${results.length} RLS checks passed — policies are correct and will enforce once activated`
      : `\n✗ ${failed} of ${results.length} RLS checks failed`,
  )
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error(e)
  try {
    await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS ${ROLE}`)
  } catch {}
  await admin.$disconnect()
  process.exit(1)
})
