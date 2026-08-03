#!/usr/bin/env node
// scripts/export-database.mjs
//
// Full JSON export of every table, written outside the repo.
//
// Used as the safety net before the Phase 1 tenancy wipe. Not a substitute for
// pg_dump in general — it captures rows, not schema, sequences or extensions —
// but for a dataset this size it is a complete and re-importable record.
//
// Usage: node scripts/export-database.mjs [outputDir]

import { PrismaClient, Prisma } from '@prisma/client'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const prisma = new PrismaClient()

const outputDir = process.argv[2] ?? join(homedir(), 'apas-backups')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outFile = join(outputDir, `apas-export-${stamp}.json`)

// Every model in the schema, straight from the generated client — so a model
// added later cannot be silently missed by this export.
const models = Prisma.dmmf.datamodel.models.map((m) => m.name)

const dump = { exportedAt: new Date().toISOString(), tables: {} }
let total = 0

for (const model of models) {
  const key = model.charAt(0).toLowerCase() + model.slice(1)
  const rows = await prisma[key].findMany()
  dump.tables[model] = rows
  total += rows.length
  console.log(`  ${model.padEnd(24)} ${rows.length}`)
}

mkdirSync(outputDir, { recursive: true })
writeFileSync(
  outFile,
  // Dates and BigInts do not survive JSON.stringify unaided.
  JSON.stringify(dump, (_key, value) => (typeof value === 'bigint' ? value.toString() : value), 2),
)

await prisma.$disconnect()

console.log(`\n✓ ${total} rows across ${models.length} tables`)
console.log(`  ${outFile}`)
