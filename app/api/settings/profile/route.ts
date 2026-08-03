import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getUserContext, unauthorized } from "@/lib/session-context"
import { unscopedDb as prisma } from "@/lib/db"

const ProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
})

export async function GET() {
  const ctx = await getUserContext()
  if (!ctx) return unauthorized()

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { name: true, email: true },
  })

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(req: NextRequest) {
  const ctx = await getUserContext()
  if (!ctx) return unauthorized()

  const body = await req.json()
  const parsed = ProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const user = await prisma.user.update({
    where: { id: ctx.userId },
    data: { name: parsed.data.name },
    select: { name: true, email: true },
  })

  return NextResponse.json(user)
}
