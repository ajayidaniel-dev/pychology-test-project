import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can } from "@/lib/roles"
import { practicePath } from "@/lib/practice-path"
import { brandingTaglineFromSettings } from "@/lib/practices"
import { PageHeader } from "@/components/layout/page-header"
import { PracticeSettingsForm } from "@/components/practice/practice-settings-form"
import { AccessLadderCard } from "@/components/areas/access-ladder-card"

export const metadata: Metadata = {
  title: "Practice settings",
}

export default async function PracticeSettingsPage() {
  const ctx = await requirePracticeContext()

  if (!can(ctx.role, "managePracticeSettings")) {
    redirect(practicePath(ctx.practiceSlug, "/dashboard"))
  }

  const db = scopedDb(ctx)
  const practice = await db.practice.findFirst({
    where: { id: ctx.practiceId },
  })
  if (!practice) redirect(practicePath(ctx.practiceSlug, "/dashboard"))

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        title="Practice settings"
        description="How this clinic appears to patients and how the team is organised"
      />

      <PracticeSettingsForm
        canActivate={can(ctx.role, "manageBilling")}
        initial={{
          name: practice.name,
          slug: practice.slug,
          status: practice.status,
          registrationNumber: practice.registrationNumber ?? "",
          contactEmail: practice.contactEmail ?? "",
          contactPhone: practice.contactPhone ?? "",
          addressLine: practice.addressLine ?? "",
          city: practice.city ?? "",
          country: practice.country ?? "",
          brandingTagline: brandingTaglineFromSettings(practice.settings) ?? "",
        }}
      />

      <AccessLadderCard
        value={practice.patientAccess}
        canEdit={can(ctx.role, "manageAreas")}
      />
    </div>
  )
}
