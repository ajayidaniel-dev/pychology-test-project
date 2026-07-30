"use client"

import { cn } from "@/lib/utils"

interface RevealRegionProps {
  /** Rendered only when present; the region collapses to zero height when not. */
  children?: React.ReactNode
  className?: string
}

/**
 * A height-animated slot for form banners and errors.
 *
 * Auth forms previously mounted alerts directly above the fields, so an error
 * shoved the whole form down the page the instant it appeared — the user's eye
 * (and their cursor) lost the submit button. This animates the region open
 * instead, using the `grid-template-rows: 0fr -> 1fr` technique so the height is
 * derived from content rather than hard-coded.
 *
 * Animating a layout property is normally avoided, but there is no transform
 * that produces a correct content-derived height, and the region is small and
 * isolated. Collapse is immediate (children unmount) so no hidden content is
 * left in the accessibility tree.
 */
export function RevealRegion({ children, className }: RevealRegionProps) {
  const open = Boolean(children)

  return (
    <div
      data-open={open}
      aria-hidden={!open}
      className={cn(
        "grid grid-rows-[0fr] opacity-0",
        "transition-[grid-template-rows,opacity] duration-200 ease-out-quart",
        "data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100",
        className,
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}
