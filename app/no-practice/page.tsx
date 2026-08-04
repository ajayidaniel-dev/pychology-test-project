import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"
import { getUserContext, listPracticeOptions } from "@/lib/session-context"
import { listPendingInvitationsForEmail } from "@/lib/invitations"
import { ROLE_LABELS } from "@/lib/roles"
import { AuthLayout } from "@/components/layout/auth-layout"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = { title: "No practice yet" }

/**
 * Where an account with no practice membership lands.
 *
 * Two exits: accept an invitation, or create a practice (Phase 8 onboarding).
 */
export default async function NoPracticePage() {
  const user = await getUserContext()
  if (!user) redirect("/auth/signin")

  const options = await listPracticeOptions(user.userId)
  if (options.length > 0) redirect(`/p/${options[0].slug}/dashboard`)

  const invites = await listPendingInvitationsForEmail(user.email)

  return (
    <AuthLayout>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
          <Building2 className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            You’re not in a practice yet
          </h1>
          <p className="text-sm text-muted-foreground">
            APAS organises patients, assessments and notes by practice. Create
            one for your clinic, or accept an invitation from a practice that
            already uses APAS.
          </p>
        </div>

        <Button asChild>
          <Link href="/onboarding">Create a practice</Link>
        </Button>

        {invites.length > 0 ? (
          <div className="flex w-full max-w-sm flex-col gap-3 text-left">
            <p className="text-sm font-medium text-foreground">
              Pending invitations
            </p>
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-2 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">{inv.practice.name}</p>
                  <p className="text-xs text-muted-foreground">
                    as {ROLE_LABELS[inv.role]}
                  </p>
                </div>
                <Button asChild size="sm" className="self-start" variant="outline">
                  <Link href={`/invitations/${inv.token}`}>Review invitation</Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Expecting an invite? Ask an owner or admin to invite{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
          </p>
        )}
      </div>
    </AuthLayout>
  )
}
