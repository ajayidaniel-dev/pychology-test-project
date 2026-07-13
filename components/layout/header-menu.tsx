"use client"

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  cloneElement,
  isValidElement,
} from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface HeaderMenuProps {
  trigger: ReactNode
  children: ReactNode | ((helpers: { close: () => void }) => ReactNode)
  className?: string
  panelClassName?: string
  align?: "end" | "start"
  label: string
  /** On mobile, span nearly full viewport width (for notification panels). */
  fullWidthMobile?: boolean
}

export function HeaderMenu({
  trigger,
  children,
  className,
  panelClassName,
  align = "end",
  label,
  fullWidthMobile = false,
}: HeaderMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  useEffect(() => {
    if (!open || !isMobile) return
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, isMobile])

  const triggerElement = isValidElement(trigger)
    ? cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
        onClick: (event: React.MouseEvent) => {
          const original = (
            trigger as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
          ).props.onClick
          original?.(event)
          setOpen((value) => !value)
        },
        "aria-expanded": open,
        "aria-haspopup": "dialog",
      })
    : trigger

  const panelContent =
    typeof children === "function"
      ? children({ close: () => setOpen(false) })
      : children

  return (
    <div ref={ref} className={cn("relative", className)}>
      {triggerElement}
      {open && isMobile && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}
      {open && (
        <div
          role="dialog"
          aria-label={label}
          className={cn(
            "z-50 rounded-md border bg-popover text-popover-foreground shadow-lg",
            isMobile
              ? cn(
                  "fixed top-14 max-h-[min(70vh,28rem)] overflow-hidden",
                  fullWidthMobile
                    ? "inset-x-3 w-auto"
                    : cn(
                        "w-[min(20rem,calc(100vw-1.5rem))]",
                        align === "end" ? "right-3" : "left-3",
                      ),
                )
              : cn(
                  "absolute top-[calc(100%+0.5rem)] shadow-md",
                  align === "end" ? "right-0" : "left-0",
                ),
            panelClassName,
          )}
        >
          {panelContent}
        </div>
      )}
    </div>
  )
}
