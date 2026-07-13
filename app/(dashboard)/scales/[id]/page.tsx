import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { ScaleDetailHeader } from "@/components/scales/scale-detail-header"
import { ScaleItemsSection } from "@/components/scales/scale-items-section"
import { ScaleThresholdsSection } from "@/components/scales/scale-thresholds-section"
import { DeleteScaleButton } from "@/components/scales/delete-scale-button"

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const scale = await prisma.scale.findUnique({
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
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const scale = await prisma.scale.findFirst({
    where: {
      id: params.id,
      OR: [{ isLibrary: true }, { psychologistId: session.user.id }],
    },
    include: {
      items: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
      thresholds: { orderBy: { minScore: "asc" } },
      _count: { select: { assessmentSessions: true } },
    },
  })

  if (!scale) notFound()

  const canDelete = !scale.isLibrary && scale._count.assessmentSessions === 0

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
        Used in {scale._count.assessmentSessions} assessment session
        {scale._count.assessmentSessions !== 1 ? "s" : ""}.
        {!canDelete &&
          !scale.isLibrary &&
          scale._count.assessmentSessions > 0 &&
          " Scale cannot be deleted while sessions reference it."}
      </p>
    </div>
  )
}
