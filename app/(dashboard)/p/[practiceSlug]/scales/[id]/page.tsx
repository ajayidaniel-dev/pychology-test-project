import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPracticeContext, requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { ScaleDetailHeader } from "@/components/scales/scale-detail-header"
import { ScaleItemsSection } from "@/components/scales/scale-items-section"
import { ScaleThresholdsSection } from "@/components/scales/scale-thresholds-section"
import { DeleteScaleButton } from "@/components/scales/delete-scale-button"

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  // This previously queried unguarded, so a scale's name was readable by id
  // without a session. Metadata now resolves through the same practice context
  // as the page, and falls back to a generic title otherwise.
  const ctx = await getPracticeContext()
  if (!ctx) return { title: "Scale" }

  const scale = await scopedDb(ctx).scale.findUnique({
    where: { id: params.id },
    select: { name: true },
  })

  return { title: scale?.name ?? "Scale" }
}

export default async function ScaleDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const ctx = await requirePracticeContext()
  const db = scopedDb(ctx)

  const scale = await db.scale.findFirst({
    where: {
      id: params.id,
      OR: [{ isLibrary: true }, { psychologistId: ctx.userId }],
    },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      thresholds: { orderBy: { minScore: "asc" } },
      _count: { select: { questionnaires: true } },
    },
  })

  if (!scale) notFound()

  const canDelete = !scale.isLibrary && scale._count.questionnaires === 0

  return (
    <div className="flex flex-col gap-6">
      <ScaleDetailHeader
        name={scale.name}
        description={scale.description}
        isLibrary={scale.isLibrary}
        actions={canDelete ? <DeleteScaleButton scaleId={scale.id} /> : undefined}
      />

      <ScaleItemsSection items={scale.items} />

      <ScaleThresholdsSection thresholds={scale.thresholds} />

      <p className="text-xs text-muted-foreground">
        Used in {scale._count.questionnaires} questionnaire
        {scale._count.questionnaires !== 1 ? "s" : ""}.
        {!canDelete &&
          !scale.isLibrary &&
          scale._count.questionnaires > 0 &&
          " Scale cannot be deleted while questionnaires reference it."}
      </p>
    </div>
  )
}
