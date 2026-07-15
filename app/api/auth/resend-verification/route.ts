import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import prisma from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { generateToken, tokenExpiresAt } from "@/lib/token"
import { sendEmail } from "@/lib/mailer"
import { signupEmailSchema } from "@/lib/validation/signup"

const bodySchema = z.object({ email: signupEmailSchema })

// Same body for every outcome — must not reveal whether an account exists or
// whether it is verified.
const UNIFORM_RESPONSE = {
  message: "If that email needs verification, a new link has been sent.",
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  const rate = checkRateLimit(`resend-verification:${ip}`, 5, 15 * 60 * 1000)
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
    )
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const { email } = parsed.data
  const user = await prisma.user.findUnique({ where: { email } })

  if (user && !user.emailVerified) {
    const token = generateToken()
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: token, verificationTokenExpiry: tokenExpiresAt() },
    })

    const origin = process.env.NEXTAUTH_URL ?? req.nextUrl.origin
    await sendEmail({
      to: email,
      subject: "Verify your APAS email",
      text: [
        "Confirm your email address to finish setting up your APAS account.",
        "",
        `Verify your email: ${origin}/api/auth/verify-email?token=${token}`,
        "",
        "This link expires in 72 hours.",
      ].join("\n"),
    })
  }

  return NextResponse.json(UNIFORM_RESPONSE)
}
