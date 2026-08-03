import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"
import { getUserContext, listPracticeOptions } from "@/lib/session-context"
import { AuthLayout } from "@/components/layout/auth-layout"

export const metadata: Metadata = { title: "No practice yet" }

/**
 * Where an account with no practice membership lands.
 *
 * A real state until practice onboarding ships: an account can exist before it
 * belongs anywhere. Every clinical screen needs a practice to scope to, so
 * rather than render an empty dashboard that quietly means nothing, say plainly
 * what is missing and who can fix it.
 */
export default async function NoPracticePage() {
  const user = await getUserContext()
  if (!user) redirect("/auth/signin")

  // Guard against landing here with a practice — an invitation accepted in
  // another tab, say.
  const options = await listPracticeOptions(user.userId)
  if (options.length > 0) redirect(`/p/${options[0].slug}/dashboard`)

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
            APAS organises patients, assessments and notes by practice, so your
            account needs to belong to one before there is anything to show.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask an owner or admin at your practice to invite{" "}
          <span className="font-medium text-foreground">{user.email}</span>. The
          invitation will appear here as soon as it is sent.
        </p>
      </div>
    </AuthLayout>
  )
}
