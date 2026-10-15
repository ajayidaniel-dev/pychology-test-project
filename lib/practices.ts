// lib/practices.ts
//
// Practice creation, slug rules, and the verification gate.
//
// A new practice starts PENDING_VERIFICATION: explore and configure are fine,
// but clinical data and invites wait until licence details are complete and the
// practice is activated. Phase 8 ships self-serve activation once registration
// number and contact email are present — a human review queue can replace that
// later without changing the status field.

import { NextResponse } from 'next/server'
import type { PracticeStatus } from '@prisma/client'
import { unscopedDb } from '@/lib/db'
import { writeAuditEntry } from '@/lib/audit'
import type { PracticeContext } from '@/lib/session-context'
import {
  isValidPracticeSlug,
  slugifyPracticeName,
} from '@/lib/practice-slug'

export {
  brandingTaglineFromSettings,
  isValidPracticeSlug,
  slugifyPracticeName,
} from '@/lib/practice-slug'

export type CreatePracticeInput = {
  actorId: string
  name: string
  slug?: string
  registrationNumber?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  addressLine?: string | null
  city?: string | null
  country?: string | null
  /** Optional area names; defaults to one "General" area. */
  areaNames?: string[]
}

export type CreatePracticeResult =
  | {
      ok: true
      practiceId: string
      slug: string
      status: PracticeStatus
      membershipId: string
    }
  | { ok: false; error: string; status: number }

export async function createPractice(
  input: CreatePracticeInput,
): Promise<CreatePracticeResult> {
  const name = input.name.trim()
  if (name.length < 2) {
    return { ok: false, error: 'Practice name is required.', status: 400 }
  }

  const slug = (input.slug?.trim() || slugifyPracticeName(name)).toLowerCase()
  if (!isValidPracticeSlug(slug)) {
    return {
      ok: false,
      error:
        'Slug must be 2–48 characters: lowercase letters, numbers, and hyphens.',
      status: 400,
    }
  }

  const existing = await unscopedDb.practice.findUnique({
    where: { slug },
    select: { id: true },
  })
  if (existing) {
    return {
      ok: false,
      error: 'That practice URL is already taken. Choose another slug.',
      status: 409,
    }
  }

  const areaNames = (input.areaNames ?? [])
    .map((n) => n.trim())
    .filter(Boolean)
  const areas =
    areaNames.length > 0 ? areaNames : ['General']

  const practice = await unscopedDb.practice.create({
    data: {
      name,
      slug,
      status: 'PENDING_VERIFICATION',
      registrationNumber: input.registrationNumber?.trim() || null,
      contactEmail: input.contactEmail?.trim().toLowerCase() || null,
      contactPhone: input.contactPhone?.trim() || null,
      addressLine: input.addressLine?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || null,
      patientAccess: 'OPEN',
      areas: {
        create: areas.map((areaName) => ({ name: areaName })),
      },
      memberships: {
        create: {
          userId: input.actorId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      },
    },
    include: {
      memberships: { where: { userId: input.actorId }, select: { id: true } },
    },
  })

  const membershipId = practice.memberships[0]?.id
  if (!membershipId) {
    return { ok: false, error: 'Failed to create ownership.', status: 500 }
  }

  // Default area assignment for the owner.
  const createdAreas = await unscopedDb.area.findMany({
    where: { practiceId: practice.id },
    select: { id: true },
  })
  if (createdAreas.length > 0) {
    await unscopedDb.membershipArea.createMany({
      data: createdAreas.map((a) => ({
        membershipId,
        areaId: a.id,
      })),
      skipDuplicates: true,
    })
  }

  await writeAuditEntry(unscopedDb, {
    practiceId: practice.id,
    actorId: input.actorId,
    action: 'practice.created',
    subjectType: 'Practice',
    subjectId: practice.id,
    metadata: { slug, status: practice.status },
  })

  return {
    ok: true,
    practiceId: practice.id,
    slug: practice.slug,
    status: practice.status,
    membershipId,
  }
}

/**
 * Self-serve activation: registration number + contact email required.
 * Replaces a human review queue for v1; status field stays the real gate.
 */
export async function activatePractice(input: {
  practiceId: string
  actorId: string
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const practice = await unscopedDb.practice.findUnique({
    where: { id: input.practiceId },
  })
  if (!practice) {
    return { ok: false, error: 'Practice not found.', status: 404 }
  }
  if (practice.status === 'ACTIVE') {
    return { ok: true }
  }
  if (practice.status === 'SUSPENDED') {
    return {
      ok: false,
      error: 'This practice is suspended and cannot be activated.',
      status: 403,
    }
  }

  if (!practice.registrationNumber?.trim() || !practice.contactEmail?.trim()) {
    return {
      ok: false,
      error:
        'Add a registration / licence number and a contact email before activating.',
      status: 400,
    }
  }

  await unscopedDb.practice.update({
    where: { id: practice.id },
    data: { status: 'ACTIVE' },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: practice.id,
    actorId: input.actorId,
    action: 'practice.activated',
    subjectType: 'Practice',
    subjectId: practice.id,
  })

  return { ok: true }
}

export function isPracticeWritable(status: PracticeStatus): boolean {
  return status === 'ACTIVE'
}

/**
 * Route handlers: 403 unless the practice can create patients / invite staff.
 */
export function practiceNotActive(
  status: PracticeStatus,
): NextResponse | null {
  if (isPracticeWritable(status)) return null
  if (status === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'This practice is suspended.' },
      { status: 403 },
    )
  }
  return NextResponse.json(
    {
      error:
        'This practice is pending verification. Complete registration details and activate before creating patients or inviting staff.',
    },
    { status: 403 },
  )
}

export async function assertPracticeActive(
  ctx: PracticeContext & { practiceStatus?: PracticeStatus },
): Promise<NextResponse | null> {
  const status =
    ctx.practiceStatus ??
    (
      await unscopedDb.practice.findUnique({
        where: { id: ctx.practiceId },
        select: { status: true },
      })
    )?.status

  if (!status) {
    return NextResponse.json({ error: 'Practice not found' }, { status: 404 })
  }
  return practiceNotActive(status)
}

export type PracticeSettingsPatch = {
  name?: string
  registrationNumber?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  addressLine?: string | null
  city?: string | null
  country?: string | null
  brandingTagline?: string | null
}

export async function updatePracticeProfile(input: {
  practiceId: string
  actorId: string
  patch: PracticeSettingsPatch
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const practice = await unscopedDb.practice.findUnique({
    where: { id: input.practiceId },
  })
  if (!practice) {
    return { ok: false, error: 'Practice not found.', status: 404 }
  }

  const name = input.patch.name?.trim()
  if (name !== undefined && name.length < 2) {
    return { ok: false, error: 'Practice name is required.', status: 400 }
  }

  const currentSettings =
    practice.settings && typeof practice.settings === 'object'
      ? (practice.settings as Record<string, unknown>)
      : {}
  const branding =
    currentSettings.branding && typeof currentSettings.branding === 'object'
      ? (currentSettings.branding as Record<string, unknown>)
      : {}

  const nextSettings =
    input.patch.brandingTagline !== undefined
      ? {
          ...currentSettings,
          branding: {
            ...branding,
            tagline: input.patch.brandingTagline?.trim() || null,
          },
        }
      : undefined

  await unscopedDb.practice.update({
    where: { id: practice.id },
    data: {
      ...(name ? { name } : {}),
      ...(input.patch.registrationNumber !== undefined
        ? { registrationNumber: input.patch.registrationNumber?.trim() || null }
        : {}),
      ...(input.patch.contactEmail !== undefined
        ? {
            contactEmail:
              input.patch.contactEmail?.trim().toLowerCase() || null,
          }
        : {}),
      ...(input.patch.contactPhone !== undefined
        ? { contactPhone: input.patch.contactPhone?.trim() || null }
        : {}),
      ...(input.patch.addressLine !== undefined
        ? { addressLine: input.patch.addressLine?.trim() || null }
        : {}),
      ...(input.patch.city !== undefined
        ? { city: input.patch.city?.trim() || null }
        : {}),
      ...(input.patch.country !== undefined
        ? { country: input.patch.country?.trim() || null }
        : {}),
      ...(nextSettings ? { settings: nextSettings } : {}),
    },
  })

  await writeAuditEntry(unscopedDb, {
    practiceId: practice.id,
    actorId: input.actorId,
    action: 'practice.profile_updated',
    subjectType: 'Practice',
    subjectId: practice.id,
  })

  return { ok: true }
}

/** Active seats for billing — ACTIVE memberships only. */
export async function countActiveSeats(practiceId: string): Promise<number> {
  return unscopedDb.membership.count({
    where: { practiceId, status: 'ACTIVE' },
  })
}
