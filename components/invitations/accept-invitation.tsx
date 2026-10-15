"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormErrorAlert } from "@/components/ui/form-error-alert"

export function AcceptInvitationActions({
  token,
  signedIn,
  emailMatches,
  inviteEmail,
  status,
}: {
  token: string
  signedIn: boolean
  emailMatches: boolean
  inviteEmail: string
  status: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<"accept" | "decline" | null>(null)

  if (status !== "PENDING") {
    return (
      <p className="text-sm text-muted-foreground">
        This invitation is no longer available ({status.toLowerCase()}).
      </p>
    )
  }

  if (!signedIn) {
    const callback = encodeURIComponent(`/invitations/${token}`)
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href={`/auth/signin?callbackUrl=${callback}`}>Sign in to accept</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/auth/signup?callbackUrl=${callback}`}>
            Create account
          </Link>
        </Button>
      </div>
    )
  }

  if (!emailMatches) {
    return (
      <FormErrorAlert
        message={`This invitation was sent to ${inviteEmail}. Sign in with that address to accept it — do not create a second account.`}
      />
    )
  }

  async function accept() {
    setError(null)
    setPending("accept")
    const res = await fetch(`/api/invitations/${token}/accept`, {
      method: "POST",
    })
    const body = await res.json().catch(() => ({}))
    setPending(null)
    if (!res.ok) {
      setError(body.error ?? "Could not accept invitation")
      return
    }
    toast.success(`Joined ${body.practiceName}`)
    router.push(body.href ?? "/dashboard")
    router.refresh()
  }

  async function decline() {
    setError(null)
    setPending("decline")
    const res = await fetch(`/api/invitations/${token}/decline`, {
      method: "POST",
    })
    const body = await res.json().catch(() => ({}))
    setPending(null)
    if (!res.ok) {
      setError(body.error ?? "Could not decline invitation")
      return
    }
    toast.success("Invitation declined")
    router.push("/no-practice")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <FormErrorAlert message={error} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={accept} disabled={pending !== null}>
          {pending === "accept" ? "Joining…" : "Accept invitation"}
        </Button>
        <Button
          variant="outline"
          onClick={decline}
          disabled={pending !== null}
        >
          Decline
        </Button>
      </div>
    </div>
  )
}
