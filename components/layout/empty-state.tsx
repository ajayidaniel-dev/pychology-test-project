import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
  /** Skip the dashed frame — for empty states rendered inside a Card. */
  plain?: boolean
}

// Deliberately not a Card: empty states often render inside one, and a
// card-in-card reads as clutter. Standalone callers get the dashed frame;
// in-card callers pass `plain` to drop the frame entirely.
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  plain = false,
}: EmptyStateProps) {
  return (
    <div className={cn(!plain && "rounded-xl border border-dashed", className)}>
      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
        {icon && (
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </div>
  )
}
