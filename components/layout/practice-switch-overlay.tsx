"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Loader2 } from "lucide-react"

/**
 * Full-viewport veil while the practice switcher navigates to another tenant.
 * Portaled to body and stacked at the modal-backdrop layer so it covers the
 * sticky header and sidebar (those sit above ordinary z-50 content).
 */
export function PracticeSwitchOverlay({
  practiceName,
}: {
  practiceName: string
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-(--z-modal-backdrop) flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
        <Loader2
          className="size-8 animate-spin text-muted-foreground"
          aria-hidden
        />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-foreground">
            Switching practice
          </p>
          <p className="text-sm text-muted-foreground">
            Loading {practiceName}…
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
