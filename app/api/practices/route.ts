import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserContext, unauthorized } from '@/lib/session-context'
import { createPractice } from '@/lib/practices'
import { listPracticeOptions } from '@/lib/session-context'

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(48).optional(),
  registrationNumber: z.string().trim().max(120).nullable().optional(),
  contactEmail: z.string().email().max(320).nullable().optional().or(z.literal('')),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  addressLine: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  areaNames: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
})

export async function POST(req: NextRequest) {
  const user = await getUserContext()
  if (!user) return unauthorized()

  const parsed = CreateSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
      { status: 400 },
    )
  }

  const result = await createPractice({
    actorId: user.userId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    registrationNumber: parsed.data.registrationNumber,
    contactEmail: parsed.data.contactEmail || null,
    contactPhone: parsed.data.contactPhone,
    addressLine: parsed.data.addressLine,
    city: parsed.data.city,
    country: parsed.data.country,
    areaNames: parsed.data.areaNames,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json(
    {
      practiceId: result.practiceId,
      slug: result.slug,
      status: result.status,
      href: `/p/${result.slug}/settings`,
    },
    { status: 201 },
  )
}

/** Practices the signed-in user already belongs to — for onboarding copy. */
export async function GET() {
  const user = await getUserContext()
  if (!user) return unauthorized()

  const options = await listPracticeOptions(user.userId)
  return NextResponse.json({ practices: options })
}
