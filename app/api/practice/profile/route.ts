import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  getPracticeContext,
  practiceContextFailure,
} from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { forbiddenUnless } from '@/lib/roles-http'
import {
  brandingTaglineFromSettings,
  updatePracticeProfile,
} from '@/lib/practices'

const PatchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  registrationNumber: z.string().trim().max(120).nullable().optional(),
  contactEmail: z
    .string()
    .email()
    .max(320)
    .nullable()
    .optional()
    .or(z.literal('')),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  addressLine: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  brandingTagline: z.string().trim().max(160).nullable().optional(),
})

export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const db = scopedDb(ctx)
  const practice = await db.practice.findFirst({
    where: { id: ctx.practiceId },
    select: {
      name: true,
      slug: true,
      status: true,
      registrationNumber: true,
      contactEmail: true,
      contactPhone: true,
      addressLine: true,
      city: true,
      country: true,
      settings: true,
    },
  })
  if (!practice) {
    return NextResponse.json({ error: 'Practice not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: practice.name,
    slug: practice.slug,
    status: practice.status,
    registrationNumber: practice.registrationNumber,
    contactEmail: practice.contactEmail,
    contactPhone: practice.contactPhone,
    addressLine: practice.addressLine,
    city: practice.city,
    country: practice.country,
    brandingTagline: brandingTaglineFromSettings(practice.settings),
    canEdit: ctx.role === 'OWNER' || ctx.role === 'ADMIN',
    canActivate: ctx.role === 'OWNER',
  })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()

  const denied = forbiddenUnless(ctx.role, 'managePracticeSettings')
  if (denied) return denied

  const parsed = PatchSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const result = await updatePracticeProfile({
    practiceId: ctx.practiceId,
    actorId: ctx.userId,
    patch: {
      ...parsed.data,
      contactEmail:
        parsed.data.contactEmail === ''
          ? null
          : parsed.data.contactEmail,
    },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({ ok: true })
}
