import { cn } from "@/lib/utils"

type PageWidth = "index" | "detail"

interface PageShellProps {
  children: React.ReactNode
  /**
   * `index` — wide, for list and table surfaces where more columns fit on
   * screen is a direct win.
   * `detail` — narrower, for records mixing prose, forms, and charts, where an
   * unconstrained measure makes body text run past a comfortable line length.
   *
   * One `max-w-7xl` served every page before this, which meant the caseload
   * table and the patient notes shared a width that suited neither.
   */
  width?: PageWidth
  className?: string
}

const WIDTHS: Record<PageWidth, string> = {
  index: "max-w-[100rem]",
  detail: "max-w-6xl",
}

export function PageShell({
  children,
  width = "index",
  className,
}: PageShellProps) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-6", WIDTHS[width], className)}>
      {children}
    </div>
  )
}
