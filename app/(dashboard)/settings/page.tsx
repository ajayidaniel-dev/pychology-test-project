import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { PageHeader } from "@/components/layout/page-header"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/auth/signin")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })

  if (!user) redirect("/auth/signin")

  return (
    // Settings is a form column, not a data surface: constrained to a readable
    // measure so inputs don't stretch the full dashboard width.
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, password, and notification preferences."
        hideTitleOnMobile
      />

      <SettingsTabs
        initialName={user.name ?? ""}
        email={user.email ?? ""}
      />
    </div>
  )
}
