import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/password"
import { signupPasswordSchema } from "@/lib/validation/signup"

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: signupPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = PasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })

  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "Password change is not available for this account." },
      { status: 400 },
    )
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  )
  if (!valid) {
    return NextResponse.json(
      { error: { currentPassword: ["Current password is incorrect"] } },
      { status: 400 },
    )
  }

  const sameAsOld = await verifyPassword(
    parsed.data.newPassword,
    user.passwordHash,
  )
  if (sameAsOld) {
    return NextResponse.json(
      {
        error: {
          newPassword: ["New password must be different from your current password"],
        },
      },
      { status: 400 },
    )
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  })

  return NextResponse.json({ ok: true })
}
