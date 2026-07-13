import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { hashPassword } from "@/lib/password"
import { signupSchema } from "@/lib/validation/signup"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = signupSchema.safeParse(body)

  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? "Invalid input"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  // Hash first to prevent timing oracle — response time must be consistent
  const passwordHash = await hashPassword(password)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Return same response as success — don't leak whether email exists
    return NextResponse.json(
      { message: "If this email is not registered, a verification link has been sent." },
      { status: 201 },
    )
  }

  await prisma.user.create({
    data: { name, email, passwordHash, emailVerified: new Date() },
  })

  return NextResponse.json({ message: "Account created." }, { status: 201 })
}
