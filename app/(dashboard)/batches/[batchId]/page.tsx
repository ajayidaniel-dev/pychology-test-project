import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { ArrowLeft, Link2Off } from "lucide-react"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { isTokenExpired } from "@/lib/token"
import { batchProgress, findOwnedBatch } from "@/lib/batches"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PageHeader } from "@/components/layout/page-header"
import { SectionHeader } from "@/components/layout/section-header"
import { BatchActions } from "@/components/batches/batch-actions"
import { BatchSessionsTable } from "@/components/batches/batch-sessions-table"
import type {
  BatchSessionRow,
  BatchSessionStatus,
} from "@/components/batches/batch-sessions-table"

export async function generateMetadata({
  params,
}: {
  params: { batchId: string }
}): Promise<Metadata> {
  const session = await getServerSession(authOptions)
  if (!session) return { title: "Batch" }

  const batch = await prisma.sessionBatch.findFirst({
    where: { id: params.batchId, psychologistId: session.user.id },
    select: { title: true },
  })

  return { title: batch?.title ?? "Batch" }
}

export default async function BatchDetailPage({
  params,
}: {
  params: { batchId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const batch = await findOwnedBatch(params.batchId, session.user.id)
  if (!batch) notFound()

  const progress = batchProgress(batch.sessions)

  const rows: BatchSessionRow[] = batch.sessions.map((clinicalSession) => {
    const completedCount = clinicalSession.questionnaires.filter(
      (q) => q.status === "COMPLETED",
    ).length
    const done =
      clinicalSession.questionnaires.length > 0 &&
      completedCount === clinicalSession.questionnaires.length

    const status: BatchSessionStatus = done
      ? "completed"
      : isTokenExpired(clinicalSession.tokenExpiresAt)
        ? "expired"
        : "pending"

    return {
      sessionId: clinicalSession.id,
      patientId: clinicalSession.patient.id,
      anonymousId: clinicalSession.patient.anonymousId,
      displayName: clinicalSession.patient.displayName,
      token: clinicalSession.token,
      status,
      completedCount,
      questionnaireCount: clinicalSession.questionnaires.length,
    }
  })

  const openLinks = rows
    .filter((row) => row.status === "pending")
    .map((row) => ({ anonymousId: row.anonymousId, token: row.token }))

  const scaleNames = [
    ...new Set(
      batch.sessions.flatMap((s) => s.questionnaires.map((q) => q.scale.name)),
    ),
  ]

  const isDirect = batch.kind === "DIRECT"

  const percent =
    progress.patientCount > 0
      ? Math.round((progress.completedCount / progress.patientCount) * 100)
      : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/batches">Batches</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{batch.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <PageHeader
          hideTitleOnMobile
          title={
            <span className="flex flex-wrap items-center gap-2">
              {batch.title}
              {isDirect && (
                <Badge variant="secondary" className="font-normal">
                  Direct
                </Badge>
              )}
            </span>
          }
          description={`${isDirect ? "Sent " : ""}${new Date(
            batch.scheduledAt,
          ).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })} · ${scaleNames.join(", ") || "No questionnaires"}`}
          actions={
            <BatchActions
              batchId={batch.id}
              openLinks={openLinks}
              expiredLinkCount={progress.expiredLinkCount}
            />
          }
        />

        {batch.reason && (
          <p className="max-w-prose text-sm text-muted-foreground">
            {batch.reason}
          </p>
        )}

        <div>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1 px-2"
            asChild
          >
            <Link href="/batches">
              <ArrowLeft className="size-4" />
              Back to batches
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium">
              {progress.completedCount} of {progress.patientCount} completed
            </p>
            <p className="text-sm text-muted-foreground">{percent}%</p>
          </div>
          <Progress value={percent} />
        </CardContent>
      </Card>

      {progress.expiredLinkCount > 0 && (
        <Alert>
          <Link2Off />
          <AlertTitle>
            {progress.expiredLinkCount} link
            {progress.expiredLinkCount === 1 ? " has" : "s have"} expired
          </AlertTitle>
          <AlertDescription>
            Those patients never finished. Renew them together from the actions
            menu to send again.
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardHeader className="border-b px-4 py-4 md:px-6">
          <SectionHeader title="Patients" />
        </CardHeader>
        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <BatchSessionsTable rows={rows} />
        </div>
      </Card>
    </div>
  )
}
