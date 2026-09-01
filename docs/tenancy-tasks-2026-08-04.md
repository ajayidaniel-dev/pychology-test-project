# Tenancy tasks — 2026-08-04

Phases 6–8 and follow-ups. One line each.

## Phase 6 — Team and invitations
- [x] Invite colleagues from `/p/<slug>/team` with a role chosen up front
- [x] Accept / decline / revoke / expire invitations (7-day expiry)
- [x] Let existing users join a second practice on the same account
- [x] Log invite email in dev; also send in-app `PRACTICE_INVITATION` when the user exists
- [x] Build team screen (members, pending invites, role change, offboard)
- [x] Enforce role matrix on team, notes, and scores
- [x] Block invites while practice is `PENDING_VERIFICATION`
- [x] Seed Harbor; owner is Owner at Renaissance and Clinician at Harbor
- [x] Add unit + integration tests for roles, invites, offboarding

## Phase 7 — Areas, care teams, referrals
- [x] Ship patient access ladder: `OPEN` / `AREA_SCOPED` / `ASSIGNED_ONLY`
- [x] Build areas CRUD at `/p/<slug>/areas`
- [x] Assign areas on patient Details and at invite time
- [x] Add care-team members on patient Details
- [x] Ship referral workflow: draft → send → accept/decline → in progress → complete
- [x] Build referrals Inbox / Outbox at `/p/<slug>/referrals`
- [x] On accept, add target area and put receiver on care team
- [x] Add unit + integration tests for access ladder and referral side effects

## Phase 8 — Onboarding, settings, billing
- [x] Self-serve practice create at `/onboarding` (`PENDING_VERIFICATION` + Owner + default areas)
- [x] Owner activate with registration number + contact email
- [x] Block patient create and invites until practice is `ACTIVE`
- [x] Show verification banner in the shell when pending / suspended
- [x] Practice settings at `/p/<slug>/settings` (profile, branding, activate, access ladder)
- [x] Account settings at `/account`; redirect legacy `/settings`
- [x] Brand fill shell / consent with practice as controller + optional tagline
- [x] Owner billing page with seat count (ACTIVE memberships); checkout placeholder
- [x] Add unit tests for slug helpers, practice gate, settings path split

## Docs
- [x] Update information architecture for shipped tenancy
- [x] Write product PRD (`docs/prd.md`)
- [x] Add Markdown → DOCX pipeline + table-width fix
- [x] Export IA and PRD to Word (`.docx`)

## UX follow-ups
- [x] Add loaders on Phase 6–8 mutation CTAs
- [x] Add practice-switch blur overlay (“Loading {name}…”)
- [x] Make switch overlay cover navbar and sidebar (portal + modal z-index)
- [x] Add referrals History tab for completed / declined inbox items

## Cleanup
- [x] Fix TypeScript errors across Phase 8 and pre-existing broken types
