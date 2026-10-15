#!/usr/bin/env node
// scripts/check-tenancy-seam.mjs
//
// Guards the two seams Phase 0 established, so the tenancy work is not quietly
// undone by new code written while it is in progress.
//
//   1. Nothing under app/ resolves the session itself — identity comes from
//      lib/session-context. This must stay at zero.
//   2. Direct `@/lib/prisma` imports under app/ are a ratchet: the count may
//      fall as Phase 3 migrates call sites to scopedDb, never rise.
//
// See docs/tenancy-implementation-plan.md.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

// Phase 3 took this to zero: nothing under app/ imports the raw client any
// more. Never raise it — use scopedDb(ctx), or unscopedDb with a reason.
const PRISMA_IMPORT_BUDGET = 0

const SESSION_ALLOWED = ['app/api/auth/[...nextauth]/route.ts']

/**
 * Files allowed to use the unscoped client, each because it genuinely has no
 * practice to scope by. Adding to this list should be a deliberate review
 * decision, which is the entire point of keeping it here.
 */
const UNSCOPED_ALLOWED = new Set([
  // Authentication and account recovery: no session, no practice yet.
  'app/api/auth/forgot-password/route.ts',
  'app/api/auth/resend-verification/route.ts',
  'app/api/auth/reset-password/route.ts',
  'app/api/auth/signup/route.ts',
  'app/api/auth/verify-email/route.ts',
  // Patient fill-by-token: authenticated by a single-use token that already
  // identifies exactly one session. The patient has no account and no practice.
  'app/api/fill/[token]/route.ts',
  'app/api/fill/[token]/questionnaires/[questionnaireId]/route.ts',
  'app/fill/[token]/page.tsx',
  // Account-level settings: about the human, not any practice they work in.
  'app/api/settings/password/route.ts',
  'app/api/settings/profile/route.ts',
  'app/(dashboard)/account/page.tsx',
  // Suicidal-ideation alerts from the user's other practices. The one
  // deliberate exception to scoping: a scoped client cannot see across the
  // boundary, which is exactly what this needs to do. Still confined to this
  // user's own notifications in practices they are an active member of.
  'app/api/notifications/route.ts',
])

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.tsx?$/.test(path) ? [path] : []
  })
}

const files = walk('app')
const sessionOffenders = []
const prismaImporters = []
const unscopedOffenders = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  if (/getServerSession|from ['"]next-auth['"]/.test(source) && !SESSION_ALLOWED.includes(file)) {
    sessionOffenders.push(file)
  }
  if (/from ['"]@\/lib\/prisma['"]/.test(source)) prismaImporters.push(file)
  if (/\bunscopedDb\b/.test(source) && !UNSCOPED_ALLOWED.has(file)) {
    unscopedOffenders.push(file)
  }
}

let failed = false

if (unscopedOffenders.length > 0) {
  failed = true
  console.error(
    '\n✗ unscopedDb used outside the reviewed allowlist. Prefer scopedDb(ctx);\n' +
      '  if this file genuinely has no practice, add it to UNSCOPED_ALLOWED in\n' +
      '  scripts/check-tenancy-seam.mjs with a one-line reason:\n' +
      unscopedOffenders.map((f) => `    ${f}`).join('\n'),
  )
}

if (sessionOffenders.length > 0) {
  failed = true
  console.error(
    '\n✗ Session resolved directly under app/. Use getUserContext / requireUser\n' +
      '  from @/lib/session-context so practice context lands in one place:\n' +
      sessionOffenders.map((f) => `    ${f}`).join('\n'),
  )
}

if (prismaImporters.length > PRISMA_IMPORT_BUDGET) {
  failed = true
  console.error(
    `\n✗ Direct @/lib/prisma imports under app/ rose to ${prismaImporters.length} ` +
      `(budget ${PRISMA_IMPORT_BUDGET}).\n` +
      '  New data access should go through scopedDb(ctx) in @/lib/db.\n',
  )
} else if (prismaImporters.length < PRISMA_IMPORT_BUDGET) {
  console.log(
    `→ Direct prisma imports under app/: ${prismaImporters.length} ` +
      `(budget ${PRISMA_IMPORT_BUDGET}). Lower PRISMA_IMPORT_BUDGET to lock the gain in.`,
  )
}

if (failed) process.exit(1)

console.log(
  `✓ Tenancy seam intact — 0 direct session lookups, ` +
    `${prismaImporters.length} raw prisma imports under app/, ` +
    `${UNSCOPED_ALLOWED.size} reviewed unscoped files.`,
)
