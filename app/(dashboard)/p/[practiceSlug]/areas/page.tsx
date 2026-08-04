import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { MapPinned } from "lucide-react"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can } from "@/lib/roles"
import { practicePath } from "@/lib/practice-path"
import { listAreas } from "@/lib/areas"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { CreateAreaDialog } from "@/components/areas/create-area-dialog"
import { AreasTable } from "@/components/areas/areas-table"
import { AccessLadderCard } from "@/components/areas/access-ladder-card"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Areas",
}

export default async function AreasPage() {
  const ctx = await requirePracticeContext()

  if (!can(ctx.role, "manageAreas")) {
    redirect(practicePath(ctx.practiceSlug, "/dashboard"))
  }

  const db = scopedDb(ctx)
  const [areas, practice] = await Promise.all([
    listAreas(db, ctx.practiceId),
    db.practice.findFirst({
      where: { id: ctx.practiceId },
      select: { patientAccess: true },
    }),
  ])

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Areas"
        count={areas.length}
        description="Rooms inside this practice — for organisation and referral routing, never a second security boundary"
        actions={<CreateAreaDialog />}
      />

      <AccessLadderCard
        value={practice?.patientAccess ?? "OPEN"}
        canEdit
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Areas</h2>
        {areas.length === 0 ? (
          <EmptyState
            icon={<MapPinned className="size-5" />}
            title="No areas yet"
            description="Add the subdivisions your practice uses — Cognitive, Forensic, or a free-text name. Assign members and patients afterward."
            action={
              <CreateAreaDialog trigger={<Button>Add first area</Button>} />
            }
          />
        ) : (
          <div className="rounded-xl border">
            <AreasTable areas={areas} />
          </div>
        )}
      </section>
    </div>
  )
}
