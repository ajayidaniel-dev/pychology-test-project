"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import Image from "next/image"

export function SignOut() {
  const { data: session } = useSession()

  if (!session?.user) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {session.user.image && (
        <Image
          src={session.user.image}
          alt={session.user.name || "User avatar"}
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <Button onClick={() => signOut({ callbackUrl: "/auth/signin" })}>Sign Out</Button>
    </div>
  )
}
