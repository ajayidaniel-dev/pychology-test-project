import Link from "next/link"
import { practiceHref } from "@/lib/practice-path-server"
import { ArrowLeft, FileText } from "lucide-react"
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
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface QuestionnaireDetailHeaderProps {
  patientId: string
  sessionId: string
  questionnaireId: string
  anonymousId: string
  sessionTitle: string
  scaleName: string
  completedAt: Date
  severity: SeverityLevel | null
}

export function QuestionnaireDetailHeader({
  patientId,
  sessionId,
  questionnaireId,
  anonymousId,
  sessionTitle,
  scaleName,
  completedAt,
  severity,
}: QuestionnaireDetailHeaderProps) {
  const formattedDate = new Date(completedAt).toLocaleDateString()
  const sessionHref = practiceHref(`/patients/${patientId}/sessions/${sessionId}`)

  return (
    <div className="space-y-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={practiceHref("/patients")}>Patients</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={practiceHref(`/patients/${patientId}`)}>{anonymousId}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={sessionHref}>{sessionTitle}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{scaleName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <PageHeader
        hideTitleOnMobile
        title={
          <span className="flex flex-wrap items-center gap-2">
            {scaleName}
            {severity && severity !== "none" && (
              <SeverityBadge severity={severity} />
            )}
          </span>
        }
        description={`Completed ${formattedDate}`}
      />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="-ml-2 h-8 gap-1 px-2" asChild>
          <Link href={sessionHref}>
            <ArrowLeft className="size-4" />
            Back to session
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1 px-2" asChild>
          <Link href={`${sessionHref}/questionnaires/${questionnaireId}/report`}>
            <FileText className="size-4" />
            Report
          </Link>
        </Button>
      </div>
    </div>
  )
}
