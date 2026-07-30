import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { getNavCounts } from "@/lib/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  // Resolved server-side so badges are correct on first paint rather than
  // popping in after hydration.
  const counts = await getNavCounts(session.user.id)

  return <DashboardShell counts={counts}>{children}</DashboardShell>
}
