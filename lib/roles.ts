// lib/roles.ts
//
// Membership roles and what they can do. Roles live on the membership, not the
// user — the same person can be Owner at one practice and Clinician at another.
//
// Safe for client and server. HTTP helpers that return NextResponse live in
// `lib/roles-http.ts` so this module never pulls `next/server` into a client
// bundle.
//
// Navigation and APIs both call `can()`. Nav is filtered, never
// rendered-then-disabled: showing a greyed-out Team link tells a clinician that
// the surface exists and they are locked out of it.
//
// See docs/information-architecture.md §9 and docs/multi-tenancy-design.md §4.

import type { MembershipRole } from '@prisma/client'

export type Capability =
  | 'manageTeam'
  | 'manageAreas'
  | 'managePracticeSettings'
  | 'manageBilling'
  | 'viewAudit'
  | 'viewNotes'
  | 'viewScores'
  | 'writeNotes'
  | 'managePatients'
  | 'scheduleSessions'
  | 'manageScales'
  | 'manageReferrals'

const MATRIX: Record<Capability, ReadonlyArray<MembershipRole>> = {
  manageTeam: ['OWNER', 'ADMIN'],
  // Same gate as Team — areas are practice organisation, not clinical content.
  manageAreas: ['OWNER', 'ADMIN'],
  managePracticeSettings: ['OWNER', 'ADMIN'],
  manageBilling: ['OWNER'],
  viewAudit: ['OWNER', 'ADMIN'],
  // Admin manages the practice but is not a clinical role — notes and scores
  // are clinical content. Front desk schedules but must not see results.
  viewNotes: ['OWNER', 'CLINICIAN', 'SUPERVISOR'],
  viewScores: ['OWNER', 'CLINICIAN', 'SUPERVISOR'],
  writeNotes: ['OWNER', 'CLINICIAN', 'SUPERVISOR'],
  managePatients: ['OWNER', 'ADMIN', 'CLINICIAN', 'SUPERVISOR', 'FRONT_DESK'],
  scheduleSessions: ['OWNER', 'ADMIN', 'CLINICIAN', 'SUPERVISOR', 'FRONT_DESK'],
  manageScales: ['OWNER', 'ADMIN', 'CLINICIAN', 'SUPERVISOR'],
  // Clinical handoff inside the practice. Front desk schedules but does not refer.
  manageReferrals: ['OWNER', 'ADMIN', 'CLINICIAN', 'SUPERVISOR'],
}

export function can(role: MembershipRole, capability: Capability): boolean {
  return MATRIX[capability].includes(role)
}

/** Roles that may be offered when inviting or changing a membership. */
export const ASSIGNABLE_ROLES: MembershipRole[] = [
  'ADMIN',
  'CLINICIAN',
  'SUPERVISOR',
  'FRONT_DESK',
]

export function isAssignableRole(role: string): role is MembershipRole {
  return (ASSIGNABLE_ROLES as string[]).includes(role)
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  CLINICIAN: 'Clinician',
  SUPERVISOR: 'Supervisor',
  FRONT_DESK: 'Front desk',
}
