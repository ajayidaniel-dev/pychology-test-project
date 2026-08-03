import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/session-context"
import { unscopedDb as prisma } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { SettingsTabs } from "@/components/settings/settings-tabs"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const ctx = await requireUser()

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
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
