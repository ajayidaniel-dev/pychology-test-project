import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { Layers, Plus, Send } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { BatchListTable } from "@/components/batches/batch-list-table"
import type { BatchListItem } from "@/components/batches/batch-list-table"
import { batchProgress } from "@/lib/batches"

export const metadata: Metadata = {
  title: "Batches",
}

export default async function BatchesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const batches = await prisma.sessionBatch.findMany({
    where: { psychologistId: session.user.id },
    include: {
      sessions: {
        select: {
          tokenExpiresAt: true,
          questionnaires: { select: { status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const rows: BatchListItem[] = batches.map((batch) => ({
    id: batch.id,
    title: batch.title,
    kind: batch.kind,
    scheduledAt: batch.scheduledAt,
    ...batchProgress(batch.sessions),
  }))

  const newBatchButton = (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-0">
        <Link href="/batches/new?kind=direct">
          <Send className="size-4" />
          Send questionnaires
        </Link>
      </Button>
      <Button asChild size="sm" className="min-h-11 sm:min-h-0">
        <Link href="/batches/new">
          <Plus className="size-4" />
          New batch
        </Link>
      </Button>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Batches"
        description={`${batches.length} batch${batches.length === 1 ? "" : "es"}`}
        hideTitleOnMobile
        actions={newBatchButton}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Layers className="size-5" />}
          title="No batches yet"
          description="Send the same questionnaires to several patients at once — as booked appointments, or as links on their own. Each patient still gets their own private link."
          action={
            <Button asChild>
              <Link href="/batches/new">Create first batch</Link>
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0 shadow-sm">
          <BatchListTable batches={rows} />
        </Card>
      )}
    </div>
  )
}
