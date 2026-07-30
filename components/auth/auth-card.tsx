"use client"

import { useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { RevealRegion } from "@/components/auth/reveal-region"

interface AuthCardProps {
  title: string
  description: React.ReactNode
  children: React.ReactNode
  /**
   * Banner slot — errors, "check your inbox", "email verified". Animates open
   * rather than shoving the form down the page. When `focusOnChange` is set,
   * focus moves here so keyboard and screen-reader users land on the
   * explanation instead of a silently re-enabled submit button.
   */
  banner?: React.ReactNode
  focusOnChange?: unknown
  footer?: React.ReactNode
}

/**
 * The shared shell for all five auth screens. Consistency here is the point:
 * a clinician who signs in, resets a password, and verifies an email should
 * meet the same title scale, the same banner behaviour, and the same footer
 * position every time.
 */
export function AuthCard({
  title,
  description,
  children,
  banner,
  focusOnChange,
  footer,
}: AuthCardProps) {
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusOnChange) bannerRef.current?.focus()
  }, [focusOnChange])

  return (
    <Card className="w-full max-w-md gap-5 shadow-sm">
      <CardHeader className="gap-1.5">
        <h1
          data-slot="card-title"
          className="text-2xl leading-none font-semibold tracking-tight text-balance"
        >
          {title}
        </h1>
        <CardDescription className="text-pretty">{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <RevealRegion>
          {banner ? (
            <div
              ref={bannerRef}
              tabIndex={-1}
              className="rounded-lg pb-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {banner}
            </div>
          ) : null}
        </RevealRegion>

        {children}

        {footer ? (
          <p className="text-center text-sm text-muted-foreground">{footer}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
