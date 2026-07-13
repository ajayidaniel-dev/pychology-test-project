import type { Metadata } from "next"
import { PageHeader } from "@/components/layout/page-header"

export const metadata: Metadata = {
  title: "New Scale",
}
import { NewScaleWizard } from "@/components/scales/new-scale-wizard"

export default function NewScalePage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="New Scale"
        description="Build a custom questionnaire"
        hideTitleOnMobile
      />
      <NewScaleWizard />
    </div>
  )
}
