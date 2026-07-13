import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { PageHeader } from "@/components/layout/page-header"
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { SeverityLevel } from "@/components/ui/severity-badge"

interface PatientProfileHeaderProps {
  anonymousId: string
  displayName: string | null
  completedCount: number
  severity: SeverityLevel | null
  actions: React.ReactNode
}

export function PatientProfileHeader({
  anonymousId,
  displayName,
  completedCount,
  severity,
  actions,
}: PatientProfileHeaderProps) {
  const description = [
    displayName,
    `${completedCount} completed session${completedCount !== 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <PageHeader
      hideTitleOnMobile
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/patients">Patients</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{anonymousId}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title={
        <span className="flex flex-wrap items-center gap-2">
          {anonymousId}
          {severity && severity !== "none" && (
            <SeverityBadge severity={severity} />
          )}
        </span>
      }
      description={description}
      actions={actions}
    />
  )
}
