import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: React.ReactNode
  description?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  hideTitleOnMobile?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  hideTitleOnMobile = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1
            className={cn(
              "text-xl font-semibold tracking-tight text-foreground",
              hideTitleOnMobile && "sr-only md:not-sr-only",
            )}
          >
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
