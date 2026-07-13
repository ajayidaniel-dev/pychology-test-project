import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  reconcileOperationalNotifications,
} from "@/lib/notifications"

const PatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("read_all") }),
  z.object({ action: z.literal("read"), id: z.string() }),
])

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await reconcileOperationalNotifications(session.user.id)
  const { items, unreadCount } = await listNotifications(session.user.id)

  return NextResponse.json({ items, unreadCount })
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

  if (parsed.data.action === "read_all") {
    await markAllNotificationsRead(session.user.id)
    return NextResponse.json({ ok: true })
  }

  const updated = await markNotificationRead(session.user.id, parsed.data.id)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
