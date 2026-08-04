"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { MembershipRole } from "@prisma/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/roles"

export function MemberRoleSelect({
  membershipId,
  role,
  disabled,
}: {
  membershipId: string
  role: MembershipRole
  disabled?: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onChange(next: string) {
    if (next === role) return
    setPending(true)
    const res = await fetch(`/api/team/members/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    })
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not update role")
      return
    }
    toast.success("Role updated")
    router.refresh()
  }

  if (disabled || role === "OWNER") {
    return (
      <span className="text-sm text-muted-foreground">{ROLE_LABELS[role]}</span>
    )
  }

  return (
    <Select
      value={role}
      onValueChange={onChange}
      disabled={pending || disabled}
    >
      <SelectTrigger className="h-8 w-[10.5rem]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ASSIGNABLE_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function OffboardMemberButton({
  membershipId,
  memberName,
  patientCount,
  disabled,
}: {
  membershipId: string
  memberName: string
  patientCount: number
  disabled?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const blocked = patientCount > 0

  async function confirm(event: React.MouseEvent) {
    if (blocked) return
    event.preventDefault()
    setPending(true)
    const res = await fetch(`/api/team/members/${membershipId}/offboard`, {
      method: "POST",
    })
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not remove member")
      return
    }
    toast.success(`${memberName} removed from this practice`)
    setOpen(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={disabled || pending}>
          Remove
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {memberName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `They are still the responsible clinician for ${patientCount} patient${patientCount === 1 ? "" : "s"}. Reassign those patients first — access ends immediately, but authorship on past work stays with them.`
              : "Their access ends immediately. Notes and sessions they authored stay with the practice; the membership is kept as departed so the audit trail remains intact."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction onClick={confirm} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove from practice"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function RevokeInvitationButton({
  invitationId,
  email,
}: {
  invitationId: string
  email: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function confirm(event: React.MouseEvent) {
    event.preventDefault()
    setPending(true)
    const res = await fetch(`/api/team/invitations/${invitationId}`, {
      method: "DELETE",
    })
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not revoke invitation")
      return
    }
    toast.success(`Invitation to ${email} revoked`)
    setOpen(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending}>
          Revoke
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke invitation?</AlertDialogTitle>
          <AlertDialogDescription>
            {email} will no longer be able to join with this link. You can send
            a new invitation later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Revoking…
              </>
            ) : (
              "Revoke"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
