import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getPracticeContext, practiceContextFailure } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
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
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  await reconcileOperationalNotifications(db, ctx.userId)
  const { items, unreadCount } = await listNotifications(db, ctx.userId)

  return NextResponse.json({ items, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const body = await req.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  if (parsed.data.action === "read_all") {
    await markAllNotificationsRead(db, ctx.userId)
    return NextResponse.json({ ok: true })
  }

  const updated = await markNotificationRead(db, ctx.userId, parsed.data.id)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
