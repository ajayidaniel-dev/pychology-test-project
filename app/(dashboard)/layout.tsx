import { redirect } from "next/navigation"
import {
  getPracticeContext,
  getUserContext,
  listPracticeOptions,
} from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getNavCounts } from "@/lib/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await getPracticeContext()

  if (!ctx) {
    // Two different failures with the same shape here, and they need different
    // answers. Not signed in → sign in. Signed in but the URL names a practice
    // this user has no active membership in (or they have none at all) → the
    // resolver deliberately refuses to fall back to a different practice, so
    // send them somewhere they can actually be.
    const user = await getUserContext()
    if (!user) redirect("/auth/signin")

    const options = await listPracticeOptions(user.userId)
    // No membership → create a practice or accept an invite.
    if (options.length === 0) redirect("/no-practice")
    redirect(`/p/${options[0].slug}/dashboard`)
  }

  const db = scopedDb(ctx)

  const [counts, options, areaCount] = await Promise.all([
    // Resolved server-side so badges are correct on first paint rather than
    // popping in after hydration.
    getNavCounts(db, ctx.userId),
    listPracticeOptions(ctx.userId),
    db.area.count(),
  ])

  return (
    <DashboardShell
      counts={counts}
      practice={{
        slug: ctx.practiceSlug,
        name: ctx.practiceName,
        practiceId: ctx.practiceId,
        role: ctx.role,
        status: ctx.practiceStatus,
        options,
        hasAreas: areaCount > 0,
      }}
    >
      {children}
    </DashboardShell>
  )
}
