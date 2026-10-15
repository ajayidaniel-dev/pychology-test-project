#!/usr/bin/env node
// scripts/check-index-usage.mjs
//
// Verifies that the app's main list queries use the tenant-leading composite
// indexes rather than scanning.
//
// A schema check is not enough: at low row counts Postgres correctly prefers a
// sequential scan, so an index can look "unused" while being perfectly healthy —
// and an index that is genuinely wrong looks identical. This seeds enough
// synthetic volume for the planner's choice to be meaningful, runs
// EXPLAIN ANALYZE, then removes everything it created.
//
// Usage: node scripts/check-index-usage.mjs [rowCount]

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ROWS = Number(process.argv[2] ?? 20000)
const SLUG = '__indexbench__'

function scanKind(plan) {
  const text = JSON.stringify(plan)
  if (/"Node Type":"Seq Scan"/.test(text)) return 'SEQ SCAN'
  if (/"Node Type":"Index Only Scan"/.test(text)) return 'index-only scan'
  if (/"Node Type":"Index Scan"/.test(text)) return 'index scan'
  if (/"Node Type":"Bitmap Heap Scan"/.test(text)) return 'bitmap index scan'
  return 'other'
}

function indexesUsed(plan) {
  const found = JSON.stringify(plan).match(/"Index Name":"([^"]+)"/g) ?? []
  return [...new Set(found.map((m) => m.split('"')[3]))]
}

async function explain(label, sql, params) {
  const rows = await prisma.$queryRawUnsafe(
    `EXPLAIN (ANALYZE, FORMAT JSON, BUFFERS) ${sql}`,
    ...params,
  )
  const plan = rows[0]['QUERY PLAN'][0]
  const ms = plan['Execution Time']
  const kind = scanKind(plan)
  const names = indexesUsed(plan)

  const ok = kind !== 'SEQ SCAN'
  console.log(
    `${ok ? '  ✓' : '  ✗'} ${label.padEnd(46)} ${kind.padEnd(18)} ${ms.toFixed(1)}ms  ${names.join(', ')}`,
  )
  return ok
}

async function main() {
  console.log(`Seeding ${ROWS.toLocaleString()} synthetic patients...`)

  await prisma.practice.deleteMany({ where: { slug: { startsWith: SLUG } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: SLUG } } })

  // Selectivity is what decides the plan, so the shape has to resemble
  // production: many practices, several clinicians each. With one practice
  // holding half the table, a sequential scan is genuinely the better plan and
  // the benchmark would be measuring nothing.
  const PRACTICES = 50
  const CLINICIANS = 10

  const users = []
  for (let i = 0; i < CLINICIANS; i++) {
    users.push(
      await prisma.user.create({
        data: { email: `${SLUG}-${i}@example.test`, name: `Bench Clinician ${i}` },
      }),
    )
  }
  const user = users[0]

  const practices = []
  for (let i = 0; i < PRACTICES; i++) {
    practices.push(
      await prisma.practice.create({
        data: { name: `Index Bench ${i}`, slug: `${SLUG}-${i}`, status: 'ACTIVE' },
      }),
    )
  }
  const practice = practices[0]

  const batch = []
  for (let i = 0; i < ROWS; i++) {
    batch.push({
      practiceId: practices[i % PRACTICES].id,
      psychologistId: users[i % CLINICIANS].id,
      displayName: `Bench ${i}`,
      anonymousId: `B-${i}`,
    })
  }
  for (let i = 0; i < batch.length; i += 5000) {
    await prisma.patient.createMany({ data: batch.slice(i, i + 5000) })
  }

  await prisma.$executeRawUnsafe('ANALYZE "Patient"')

  console.log(`\nEXPLAIN ANALYZE — practice ${practice.id}\n`)

  const results = [
    await explain(
      'patient list (practiceId, createdAt DESC)',
      'SELECT * FROM "Patient" WHERE "practiceId" = $1 ORDER BY "createdAt" DESC LIMIT 50',
      [practice.id],
    ),
    await explain(
      'patient count for practice',
      'SELECT count(*) FROM "Patient" WHERE "practiceId" = $1',
      [practice.id],
    ),
    await explain(
      'patient by anonymousId within practice',
      'SELECT * FROM "Patient" WHERE "practiceId" = $1 AND "anonymousId" = $2',
      [practice.id, 'B-4242'],
    ),
    await explain(
      'caseload by responsible clinician',
      'SELECT * FROM "Patient" WHERE "practiceId" = $1 AND "psychologistId" = $2 LIMIT 50',
      [practice.id, user.id],
    ),
  ]

  console.log('\nCleaning up...')
  await prisma.practice.deleteMany({ where: { slug: { startsWith: SLUG } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: SLUG } } })
  await prisma.$disconnect()

  const failed = results.filter((r) => !r).length
  console.log(
    failed === 0
      ? '\n✓ every tenant-scoped query used an index'
      : `\n✗ ${failed} quer${failed === 1 ? 'y' : 'ies'} fell back to a sequential scan`,
  )
  process.exit(failed === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error(e)
  await prisma.practice.deleteMany({ where: { slug: { startsWith: SLUG } } })
  await prisma.user.deleteMany({ where: { email: { startsWith: SLUG } } })
  await prisma.$disconnect()
  process.exit(1)
})
