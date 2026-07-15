import { createHash, randomBytes } from "crypto"
import prisma from "@/lib/prisma"

/** 1 hour in milliseconds */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000

const IDENTIFIER_PREFIX = "password-reset:"

// Only the SHA-256 hash is stored, so a leaked database row can't be used as
// a working reset link.
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export async function createPasswordResetToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex")
  const identifier = IDENTIFIER_PREFIX + email

  await prisma.verificationToken.deleteMany({ where: { identifier } })
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashToken(token),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  return token
}

/**
 * Validates and deletes the reset token (single use, even when expired).
 * Returns the email it was issued for, or null if invalid/expired.
 */
export async function consumePasswordResetToken(token: string): Promise<string | null> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(token) },
  })

  if (!record || !record.identifier.startsWith(IDENTIFIER_PREFIX)) return null

  await prisma.verificationToken.delete({ where: { token: record.token } })

  if (record.expires < new Date()) return null

  return record.identifier.slice(IDENTIFIER_PREFIX.length)
}
