import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  })

  if (!user) {
    return NextResponse.json({ unverified: false })
  }

  return NextResponse.json({ unverified: !user.emailVerified })
}
