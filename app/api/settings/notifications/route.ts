import { NextRequest, NextResponse } from "next/server"
import { NotificationType } from "@prisma/client"
import { z } from "zod"
import { getUserContext, unauthorized } from "@/lib/session-context"
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notification-preferences"

const PatchSchema = z.object({
  preferences: z.array(
    z.object({
      type: z.nativeEnum(NotificationType),
      enabled: z.boolean(),
    }),
  ),
})

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return unauthorized()

  const preferences = await getNotificationPreferences(ctx.userId)
  return NextResponse.json({ preferences })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return unauthorized()

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const preferences = await updateNotificationPreferences(
    ctx.userId,
    parsed.data.preferences,
  )

  return NextResponse.json({ preferences })
}
