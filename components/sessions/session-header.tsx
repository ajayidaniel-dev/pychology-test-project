import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/page-header"
import { CopyLinkButton } from "@/components/sessions/copy-link-button"
import {
  SendStatusBadge,
  SessionStatusBadge,
} from "@/components/sessions/status-badges"
import type { SendStatus } from "@/lib/direct-sends"
import { SessionActions } from "@/components/sessions/session-actions"

interface SessionHeaderProps {
  patientId: string
  sessionId: string
  anonymousId: string
  title: string
  reason: string | null
  scheduledAt: Date
  status: string
  token: string
  linkExpired: boolean
  hasPendingQuestionnaires: boolean
  /** APPOINTMENT | DIRECT — a direct send was never booked, only sent. */
  kind?: string
  /** Rolled-up state of a direct send. Ignored for appointments. */
  sendStatus?: SendStatus
}

export function SessionHeader({
  patientId,
  sessionId,
  anonymousId,
  title,
  reason,
  scheduledAt,
  status,
  token,
  linkExpired,
  hasPendingQuestionnaires,
  kind = "APPOINTMENT",
  sendStatus = "pending",
}: SessionHeaderProps) {
  const isDirect = kind === "DIRECT"
  const formattedDate = new Date(scheduledAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="space-y-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/patients">Patients</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/patients/${patientId}`}>{anonymousId}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        hideTitleOnMobile
        title={
          <span className="flex flex-wrap items-center gap-2">
            {title}
            {isDirect ? (
              <SendStatusBadge status={sendStatus} />
            ) : (
              <SessionStatusBadge status={status} />
            )}
          </span>
        }
        description={isDirect ? `Sent ${formattedDate}` : formattedDate}
        actions={
          <SessionActions
            patientId={patientId}
            sessionId={sessionId}
            title={title}
            reason={reason}
            scheduledAt={scheduledAt}
            status={status}
            linkExpired={linkExpired}
            kind={kind}
          />
        }
      />

      {reason && (
        <p className="max-w-prose text-sm text-muted-foreground">{reason}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 px-2" asChild>
          <Link href={`/patients/${patientId}`}>
            <ArrowLeft className="size-4" />
            Back to patient
          </Link>
        </Button>
        {hasPendingQuestionnaires && !linkExpired && status !== "CANCELLED" && (
          <CopyLinkButton token={token} />
        )}
      </div>
    </div>
  )
}
