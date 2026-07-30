"use client"

import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: React.ReactNode
  className?: string
}

const LEGAL = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/retention", label: "Data retention" },
] as const

/**
 * A single centred card on a quiet field.
 *
 * The previous two-panel split gave the marketing surface half the viewport on
 * a screen whose only job is one short form. Centring it puts the task in the
 * optical centre at every breakpoint and removes the layout's mobile/desktop
 * fork — there is now one composition, not two.
 *
 * Brand sits above the card and supporting text below it, so the card itself
 * holds nothing but the task.
 */
export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col bg-background",
        className,
      )}
    >
      <div className="absolute top-4 right-4 z-(--z-sticky)">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <div className="auth-enter flex w-full max-w-md flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-base font-bold text-primary ring-1 ring-inset ring-primary/20">
              A
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-base leading-none font-semibold tracking-tight">
                APAS
              </p>
              <p className="font-mono text-xs tracking-[0.08em] text-muted-foreground">
                CLINICAL OVERWATCH
              </p>
            </div>
          </div>

          {children}

          <div className="flex flex-col items-center gap-3">
            <p className="max-w-sm text-center text-xs leading-relaxed text-pretty text-muted-foreground">
              Decision support for licensed clinicians. Not a substitute for
              clinical judgment.
            </p>

            <nav
              aria-label="Legal"
              className="flex items-center gap-x-3 gap-y-1 text-xs"
            >
              {LEGAL.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-sm text-muted-foreground underline-offset-4 transition-colors duration-150 ease-out-quart hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </main>
    </div>
  )
}
