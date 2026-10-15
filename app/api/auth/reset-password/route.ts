import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { unscopedDb as prisma } from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { checkRateLimit } from "@/lib/rate-limit"
import { consumePasswordResetToken } from "@/lib/password-reset"
import { signupPasswordSchema } from "@/lib/validation/signup"

const bodySchema = z.object({
  token: z.string().min(1),
  password: signupPasswordSchema,
})

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rate = checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid input"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const email = await consumePasswordResetToken(parsed.data.token)
  if (!email) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 },
    )
  }

  const passwordHash = await hashPassword(parsed.data.password)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Completing a reset proves ownership of the inbox.
      emailVerified: user.emailVerified ?? new Date(),
    },
  })

  return NextResponse.json({ message: "Password updated." })
}
