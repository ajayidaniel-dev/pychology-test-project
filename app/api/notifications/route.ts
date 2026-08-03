import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getPracticeContext, practiceContextFailure } from "@/lib/session-context"
import { scopedDb, unscopedDb } from "@/lib/db"
import {
  listIdeationAlertsElsewhere,
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

  const [{ items, unreadCount }, elsewhere] = await Promise.all([
    listNotifications(db, ctx.userId),
    // Deliberately unscoped — see listIdeationAlertsElsewhere. A suicidal
    // ideation alert must reach the clinician whichever practice they happen
    // to be looking at.
    listIdeationAlertsElsewhere(unscopedDb, ctx.userId, ctx.practiceId),
  ])

  return NextResponse.json({
    items: [...elsewhere, ...items],
    unreadCount: unreadCount + elsewhere.length,
  })
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
