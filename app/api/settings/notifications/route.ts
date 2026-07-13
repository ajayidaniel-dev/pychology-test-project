import { NextRequest, NextResponse } from "next/server"
import { NotificationType } from "@prisma/client"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
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
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const preferences = await getNotificationPreferences(session.user.id)
  return NextResponse.json({ preferences })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const preferences = await updateNotificationPreferences(
    session.user.id,
    parsed.data.preferences,
  )

  return NextResponse.json({ preferences })
}
