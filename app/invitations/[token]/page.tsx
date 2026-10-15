import type { Metadata } from "next"
import { Building2 } from "lucide-react"
import { getUserContext } from "@/lib/session-context"
import { normalizeInviteEmail, peekInvitation } from "@/lib/invitations"
import { ROLE_LABELS } from "@/lib/roles"
import { AuthLayout } from "@/components/layout/auth-layout"
import { AcceptInvitationActions } from "@/components/invitations/accept-invitation"

export const metadata: Metadata = {
  title: "Practice invitation",
}

export default async function InvitationPage({
  params,
}: {
  params: { token: string }
}) {
  const [invitation, user] = await Promise.all([
    peekInvitation(params.token),
    getUserContext(),
  ])

  if (!invitation) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Invitation not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This link may be wrong, or the invitation was revoked.
          </p>
        </div>
      </AuthLayout>
    )
  }

  const emailMatches = Boolean(
    user?.email &&
      normalizeInviteEmail(user.email) === invitation.email,
  )

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
          <Building2 className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Join {invitation.practiceName}
          </h1>
          <p className="text-sm text-muted-foreground">
            You have been invited as{" "}
            <span className="font-medium text-foreground">
              {ROLE_LABELS[invitation.role]}
            </span>
            . Sent to{" "}
            <span className="font-medium text-foreground">
              {invitation.email}
            </span>
            .
          </p>
        </div>
        <AcceptInvitationActions
          token={params.token}
          signedIn={Boolean(user)}
          emailMatches={emailMatches}
          inviteEmail={invitation.email}
          status={invitation.status}
        />
      </div>
    </AuthLayout>
  )
}
