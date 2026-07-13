"use client"

import { Activity, BarChart3, ShieldCheck } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

interface AuthLayoutProps {
  children: React.ReactNode
  className?: string
}

const FEATURES = [
  {
    icon: Activity,
    title: "Real-time clinical alerts",
    description: "Severity thresholds surface what needs attention first.",
  },
  {
    icon: BarChart3,
    title: "Longitudinal score tracking",
    description: "PHQ-9, GAD-7, BDI-II and custom scales in one view.",
  },
  {
    icon: ShieldCheck,
    title: "Clinician-first privacy",
    description: "Anonymous patient IDs with secure, single-use assessment links.",
  },
] as const

function AuthBrandingPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-auth-panel" />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />

      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
        {/* Brand lockup */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/25">
              <span className="text-sm font-bold tracking-tight text-primary">A</span>
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-auth-panel-foreground">
                APAS
              </p>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-auth-panel-muted">
                Clinical Overwatch
              </p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight text-auth-panel-foreground xl:text-4xl">
              Clinical intelligence for modern psychology practice
            </h1>
            <p className="text-base leading-relaxed text-auth-panel-muted">
              Monitor assessments, track severity trends, and act on alerts — without
              leaving your workflow.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="max-w-md space-y-5">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                <Icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-auth-panel-foreground">{title}</p>
                <p className="text-sm leading-relaxed text-auth-panel-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-auth-panel-muted/80">
          Decision support for licensed clinicians. Not a substitute for clinical judgment.
        </p>
      </div>
    </div>
  )
}

export function AuthLayout({ children, className }: AuthLayoutProps) {
  return (
    <div className={cn("relative min-h-screen bg-background", className)}>
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2">
        <AuthBrandingPanel />

        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-8 lg:min-h-0 lg:px-12">
          <div className="mb-8 w-full max-w-md text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <span className="text-sm font-bold text-primary">A</span>
            </div>
            <p className="text-2xl font-semibold tracking-tight">APAS</p>
            <p className="text-sm text-muted-foreground">Clinical Overwatch</p>
          </div>
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
