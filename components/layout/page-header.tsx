import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: React.ReactNode
  description?: string
  actions?: React.ReactNode
  breadcrumb?: React.ReactNode
  /**
   * Rendered beside the title in muted ink. How many patients, scales, or
   * batches there are is information a clinician wants before they start
   * scanning, and it costs no vertical space here.
   */
  count?: number
  hideTitleOnMobile?: boolean
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  count,
  hideTitleOnMobile = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {breadcrumb}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1
            className={cn(
              "flex items-baseline gap-2 text-xl font-semibold tracking-tight text-foreground",
              hideTitleOnMobile && "sr-only md:not-sr-only",
            )}
          >
            {title}
            {typeof count === "number" && (
              <span className="font-mono text-base font-normal tabular-nums text-muted-foreground">
                {count.toLocaleString()}
              </span>
            )}
          </h1>
          {description && (
            <p className="text-sm text-pretty text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
