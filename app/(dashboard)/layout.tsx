import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getNavCounts } from "@/lib/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  // Resolved server-side so badges are correct on first paint rather than
  // popping in after hydration.
  const counts = await getNavCounts(db, ctx.userId)

  return <DashboardShell counts={counts}>{children}</DashboardShell>
}
