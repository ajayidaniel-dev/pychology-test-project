import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"
import { getUserContext, listPracticeOptions } from "@/lib/session-context"
import { AuthLayout } from "@/components/layout/auth-layout"
import { CreatePracticeForm } from "@/components/onboarding/create-practice-form"

export const metadata: Metadata = { title: "Create a practice" }

/**
 * Self-serve practice creation. Account already exists; this attaches an Owner
 * membership and a PENDING_VERIFICATION practice.
 */
export default async function OnboardingPage() {
  const user = await getUserContext()
  if (!user) redirect("/auth/signin?callbackUrl=/onboarding")

  const options = await listPracticeOptions(user.userId)
  // Already in a practice — onboarding is for the no-membership case. Creating
  // a *second* practice can wait; switcher + invites cover multi-practice today.
  if (options.length > 0) {
    redirect(`/p/${options[0].slug}/dashboard`)
  }

  return (
    <AuthLayout>
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg border bg-muted/40">
            <Building2 className="size-5 text-muted-foreground" aria-hidden />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Create your practice
            </h1>
            <p className="text-sm text-muted-foreground">
              A practice is your clinic on APAS — the boundary for patients,
              notes and billing. You’ll be the owner.
            </p>
          </div>
        </div>
        <CreatePracticeForm />
      </div>
    </AuthLayout>
  )
}
