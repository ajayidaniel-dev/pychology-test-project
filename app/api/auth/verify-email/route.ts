import { NextRequest, NextResponse } from 'next/server'
import { unscopedDb as prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { verificationToken: token } })

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })

  return NextResponse.redirect(new URL('/auth/signin?verified=1', req.url))
}
