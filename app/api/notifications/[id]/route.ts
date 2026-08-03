import { NextResponse } from "next/server"
import { getPracticeContext, practiceContextFailure } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { markNotificationRead } from "@/lib/notifications"

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const updated = await markNotificationRead(db, ctx.userId, params.id)
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
