import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { PageShell } from "@/components/layout/page-shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  return (
    <DashboardShell>
      <PageShell>{children}</PageShell>
    </DashboardShell>
  )
}
