import type { Metadata } from "next"
import { practiceHref } from "@/lib/practice-path-server"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Scales",
}
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ScaleListSection } from "@/components/scales/scale-list-section"
import { Plus } from "lucide-react"

export default async function ScalesPage() {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  const [libraryScales, myScales] = await Promise.all([
    db.scale.findMany({
      where: { isLibrary: true },
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    }),
    db.scale.findMany({
      where: { psychologistId: ctx.userId, isLibrary: false },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scales"
        description="Validated library instruments and your custom questionnaires"
        hideTitleOnMobile
        actions={
          <Button asChild>
            <Link href={practiceHref("/scales/new")}>
              <Plus className="size-4" />
              New Scale
            </Link>
          </Button>
        }
      />

      <ScaleListSection libraryScales={libraryScales} myScales={myScales} />
    </div>
  )
}
