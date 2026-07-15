import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { createPasswordResetToken, RESET_TOKEN_TTL_MS } from "@/lib/password-reset"
import { sendEmail } from "@/lib/mailer"
import { signupEmailSchema } from "@/lib/validation/signup"

const bodySchema = z.object({ email: signupEmailSchema })

// Same body for every outcome — the endpoint must not reveal whether an
// account exists.
const UNIFORM_RESPONSE = {
  message:
    "If an account exists for that email, a password reset link has been sent.",
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rate = checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many reset requests. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (user?.passwordHash) {
    const token = await createPasswordResetToken(email)
    const origin = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    const resetUrl = `${origin}/auth/reset-password?token=${token}`
    const ttlMinutes = Math.round(RESET_TOKEN_TTL_MS / 60_000)

    await sendEmail({
      to: email,
      subject: "Reset your APAS password",
      text: [
        "We received a request to reset the password for your APAS account.",
        "",
        `Reset your password: ${resetUrl}`,
        "",
        `This link expires in ${ttlMinutes} minutes and can be used once.`,
        "If you didn't request this, you can safely ignore this email.",
      ].join("\n"),
    })
  }

  return NextResponse.json(UNIFORM_RESPONSE)
}
