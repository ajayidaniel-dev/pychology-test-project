import Link from "next/link"
import { Lock } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/layout/page-header"

interface ScaleDetailHeaderProps {
  name: string
  description: string | null
  isLibrary: boolean
  actions?: React.ReactNode
}

export function ScaleDetailHeader({
  name,
  description,
  isLibrary,
  actions,
}: ScaleDetailHeaderProps) {
  return (
    <PageHeader
      hideTitleOnMobile
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/scales">Scales</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title={
        <span className="flex flex-wrap items-center gap-2">
          {name}
          {isLibrary && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Lock className="size-3" />
              Library
            </Badge>
          )}
        </span>
      }
      description={description ?? undefined}
      actions={actions}
    />
  )
}
