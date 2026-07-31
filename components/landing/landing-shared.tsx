import Link from "next/link"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { SeverityBadge, type SeverityLevel } from "@/components/ui/severity-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

export const LANDING_VARIANTS = [
  {
    id: "a",
    href: "/compare/a",
    title: "Full-bleed quiet room",
    summary: "Atmosphere first — room photo, then proof below.",
  },
  {
    id: "b",
    href: "/compare/b",
    title: "Split room + triage",
    summary: "Scene beside the question; caseload peeks early.",
  },
  {
    id: "c",
    href: "/compare/c",
    title: "Navy + caseload mock",
    summary: "Identity bar, desk still life, instrument in-frame.",
  },
] as const

export type LandingVariantId = (typeof LANDING_VARIANTS)[number]["id"]

const SYNTHETIC_ROWS: {
  code: string
  instrument: string
  score: string
  delta: string
  severity: SeverityLevel
  updated: string
}[] = [
  {
    code: "Patient A",
    instrument: "PHQ-9",
    score: "21",
    delta: "+6",
    severity: "critical",
    updated: "Today 09:14",
  },
  {
    code: "Patient B",
    instrument: "GAD-7",
    score: "14",
    delta: "+2",
    severity: "high",
    updated: "Yesterday",
  },
  {
    code: "Patient C",
    instrument: "PHQ-9",
    score: "8",
    delta: "−3",
    severity: "moderate",
    updated: "2 days ago",
  },
]

export function CompareSwitcher({
  active,
  tone = "light",
}: {
  active: LandingVariantId
  tone?: "light" | "dark" | "over-photo"
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 rounded-md border px-1 py-1 text-xs",
        tone === "light" && "border-border bg-background/90 text-muted-foreground",
        tone === "dark" &&
          "border-white/15 bg-black/40 text-white/70 backdrop-blur-sm",
        tone === "over-photo" &&
          "border-white/20 bg-black/35 text-white/75 backdrop-blur-sm",
      )}
      role="navigation"
      aria-label="Landing variants"
    >
      <span
        className={cn(
          "px-2 font-mono tracking-[0.06em]",
          tone === "light" ? "text-muted-foreground" : "text-white/50",
        )}
      >
        COMPARE
      </span>
      {LANDING_VARIANTS.map((v) => {
        const isActive = v.id === active
        return (
          <Link
            key={v.id}
            href={v.href}
            className={cn(
              "rounded px-2.5 py-1 font-medium transition-colors",
              isActive
                ? tone === "light"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-[oklch(0.16_0.035_255)]"
                : tone === "light"
                  ? "hover:bg-muted hover:text-foreground"
                  : "hover:bg-white/10 hover:text-white",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {v.id.toUpperCase()}
          </Link>
        )
      })}
    </div>
  )
}

export function LandingAuthActions({
  size = "default",
  ghostOnPhoto = false,
}: {
  size?: "default" | "lg"
  ghostOnPhoto?: boolean
}) {
  if (ghostOnPhoto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          asChild
          size={size}
          className="bg-[oklch(0.45_0.15_240)] text-[oklch(0.98_0.005_240)] hover:bg-[oklch(0.45_0.15_240)]/90"
        >
          <Link href="/auth/signup">Sign up</Link>
        </Button>
        <Button
          asChild
          size={size}
          variant="outline"
          className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/auth/signin">Log in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild size={size}>
        <Link href="/auth/signup">Sign up</Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <Link href="/auth/signin">Log in</Link>
      </Button>
    </div>
  )
}

export function LandingChrome({
  active,
  tone = "light",
  showThemeToggle = true,
}: {
  active: LandingVariantId
  tone?: "light" | "dark" | "over-photo"
  showThemeToggle?: boolean
}) {
  const wordmarkClass =
    tone === "light"
      ? "text-foreground"
      : "text-white"

  return (
    <header
      className={cn(
        "relative z-10",
        tone === "light" && "border-b border-border bg-background/90 backdrop-blur-sm",
        tone === "dark" && "border-b border-white/10 bg-[oklch(0.16_0.035_255)]",
        tone === "over-photo" && "border-b border-white/10 bg-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/compare" className={cn("shrink-0 font-semibold tracking-[-0.02em]", wordmarkClass)}>
            APAS
          </Link>
          <CompareSwitcher active={active} tone={tone === "light" ? "light" : "over-photo"} />
        </div>
        <div className="flex items-center gap-2">
          {showThemeToggle && tone === "light" ? <ThemeToggle /> : null}
          {tone === "light" ? (
            <>
              <Button asChild variant="ghost" className="hidden sm:inline-flex">
                <Link href="/auth/signin">Log in</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <Link href="/auth/signin">Log in</Link>
              </Button>
              <Button
                asChild
                className="bg-white text-[oklch(0.16_0.035_255)] hover:bg-white/90"
              >
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function SyntheticCaseload({
  variant = "light",
  title = "Caseload",
  className,
}: {
  variant?: "light" | "dark"
  title?: string
  className?: string
}) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border shadow-sm",
        variant === "light" && "border-border bg-card text-card-foreground",
        variant === "dark" &&
          "border-white/10 bg-[oklch(0.14_0.03_255)] text-[oklch(0.97_0.008_250)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b px-4 py-3",
          variant === "light" ? "border-border" : "border-white/10",
        )}
      >
        <div>
          <figcaption className="text-sm font-semibold tracking-[-0.01em]">
            {title}
          </figcaption>
          <p
            className={cn(
              "mt-0.5 font-mono text-xs",
              variant === "light" ? "text-muted-foreground" : "text-white/50",
            )}
          >
            Synthetic demo · not live patient data
          </p>
        </div>
        <span
          className={cn(
            "font-mono text-xs",
            variant === "light" ? "text-muted-foreground" : "text-white/45",
          )}
        >
          3 needing review
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr
              className={cn(
                "border-b font-mono text-xs tracking-[0.04em]",
                variant === "light"
                  ? "border-border text-muted-foreground"
                  : "border-white/10 text-white/45",
              )}
            >
              <th className="px-4 py-2.5 font-medium">Code</th>
              <th className="px-4 py-2.5 font-medium">Scale</th>
              <th className="px-4 py-2.5 font-medium">Score</th>
              <th className="px-4 py-2.5 font-medium">Δ</th>
              <th className="px-4 py-2.5 font-medium">Severity</th>
              <th className="px-4 py-2.5 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {SYNTHETIC_ROWS.map((row) => (
              <tr
                key={row.code}
                className={cn(
                  "border-b last:border-0",
                  variant === "light" ? "border-border" : "border-white/8",
                  row.severity === "critical" &&
                    (variant === "light"
                      ? "bg-severity-critical/5"
                      : "bg-severity-critical/10"),
                )}
              >
                <td className="px-4 py-3 font-medium">{row.code}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-mono text-xs",
                    variant === "light" ? "text-muted-foreground" : "text-white/55",
                  )}
                >
                  {row.instrument}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums">{row.score}</td>
                <td
                  className={cn(
                    "px-4 py-3 font-mono tabular-nums",
                    row.delta.startsWith("+")
                      ? "text-severity-critical-ink"
                      : variant === "light"
                        ? "text-muted-foreground"
                        : "text-white/70",
                  )}
                >
                  {row.delta}
                </td>
                <td className="px-4 py-3">
                  <SeverityBadge severity={row.severity} />
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-xs",
                    variant === "light" ? "text-muted-foreground" : "text-white/50",
                  )}
                >
                  {row.updated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

export function LandingFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <footer
      className={cn(
        "border-t",
        tone === "light"
          ? "border-border bg-background text-muted-foreground"
          : "border-white/10 bg-[oklch(0.12_0.03_255)] text-white/55",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 APAS · Decision support for licensed clinicians</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link
            href="/legal/privacy"
            className={tone === "light" ? "hover:text-foreground" : "hover:text-white"}
          >
            Privacy
          </Link>
          <Link
            href="/legal/terms"
            className={tone === "light" ? "hover:text-foreground" : "hover:text-white"}
          >
            Terms
          </Link>
          <Link
            href="/legal/retention"
            className={tone === "light" ? "hover:text-foreground" : "hover:text-white"}
          >
            Retention
          </Link>
          <Link
            href="/auth/signin"
            className={tone === "light" ? "hover:text-foreground" : "hover:text-white"}
          >
            Log in
          </Link>
        </nav>
      </div>
    </footer>
  )
}

export function StoryBeatImage({
  src,
  alt,
  priority = false,
}: {
  src: string
  alt: string
  priority?: boolean
}) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 560px"
      />
    </div>
  )
}

export function ClosingCta({ tone = "light" }: { tone?: "light" | "dark" }) {
  if (tone === "dark") {
    return (
      <section className="border-t border-white/10 bg-[oklch(0.12_0.03_255)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <div>
            <p className="max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance text-white">
              Ten seconds to “who needs my attention?”
            </p>
            <p className="mt-2 max-w-md text-sm text-white/55 text-pretty">
              Decision support for licensed clinicians. Not a substitute for clinical
              judgment.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-[oklch(0.16_0.035_255)] hover:bg-white/90"
            >
              <Link href="/auth/signup">Create your account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/45 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/auth/signin">Log in</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
        <div>
          <p className="max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance">
            Ten seconds to “who needs my attention?”
          </p>
          <p className="mt-2 max-w-md text-sm text-muted-foreground text-pretty">
            Decision support for licensed clinicians. Not a substitute for clinical
            judgment.
          </p>
        </div>
        <LandingAuthActions size="lg" />
      </div>
    </section>
  )
}

const TIMELINE = [
  { week: "W1", score: 18, note: "Baseline PHQ-9" },
  { week: "W3", score: 15, note: "Δ −3" },
  { week: "W5", score: 12, note: "Moderate" },
  { week: "W7", score: 21, note: "Critical · flagged" },
] as const

export function SyntheticTimeline({
  variant = "light",
  className,
}: {
  variant?: "light" | "dark"
  className?: string
}) {
  const max = 27
  return (
    <figure
      className={cn(
        "rounded-xl border p-6 shadow-sm",
        variant === "light" && "border-border bg-card",
        variant === "dark" && "border-white/10 bg-[oklch(0.14_0.03_255)]",
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold tracking-[-0.01em]">
            Patient A · PHQ-9 trend
          </p>
          <p
            className={cn(
              "mt-0.5 font-mono text-xs",
              variant === "light" ? "text-muted-foreground" : "text-white/50",
            )}
          >
            Synthetic demo · longitudinal signal
          </p>
        </div>
        <SeverityBadge severity="critical" />
      </figcaption>
      <ol className="mt-8 flex items-end gap-3 sm:gap-5">
        {TIMELINE.map((point) => {
          const height = Math.max(18, Math.round((point.score / max) * 140))
          const critical = point.score >= 20
          return (
            <li key={point.week} className="flex flex-1 flex-col items-center gap-2">
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  critical
                    ? "text-severity-critical-ink"
                    : variant === "light"
                      ? "text-muted-foreground"
                      : "text-white/55",
                )}
              >
                {point.score}
              </span>
              <div
                className={cn(
                  "w-full max-w-14 rounded-sm",
                  critical
                    ? "bg-severity-critical"
                    : variant === "light"
                      ? "bg-primary/35"
                      : "bg-[oklch(0.55_0.16_250)]/55",
                )}
                style={{ height }}
                aria-hidden
              />
              <span
                className={cn(
                  "font-mono text-xs",
                  variant === "light" ? "text-muted-foreground" : "text-white/45",
                )}
              >
                {point.week}
              </span>
              <span
                className={cn(
                  "text-center text-xs leading-snug",
                  variant === "light" ? "text-muted-foreground" : "text-white/50",
                )}
              >
                {point.note}
              </span>
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

export function InstrumentStrip({ tone = "light" }: { tone?: "light" | "dark" }) {
  const items = [
    ["PHQ-9", "Depression"],
    ["GAD-7", "Anxiety"],
    ["BDI-II", "Depression"],
    ["Custom", "Your scales"],
  ] as const
  return (
    <section
      className={cn(
        "border-y",
        tone === "light"
          ? "border-border bg-muted/40"
          : "border-white/10 bg-[oklch(0.14_0.03_255)]",
      )}
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px sm:grid-cols-4">
        {items.map(([name, role]) => (
          <div key={name} className="px-6 py-8">
            <p
              className={cn(
                "font-mono text-sm font-semibold tracking-[-0.01em]",
                tone === "dark" && "text-white",
              )}
            >
              {name}
            </p>
            <p
              className={cn(
                "mt-1 text-xs",
                tone === "light" ? "text-muted-foreground" : "text-white/50",
              )}
            >
              {role}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function HowItWorks({ tone = "light" }: { tone?: "light" | "dark" }) {
  const steps = [
    {
      title: "Send a secure link",
      body: "Single-use assessment links for PHQ-9, GAD-7, BDI-II, or a custom scale — expire after 72 hours.",
    },
    {
      title: "Score on submit",
      body: "Responses classify against published cut-scores the moment the patient finishes. No spreadsheet, no delay.",
    },
    {
      title: "Watch the caseload",
      body: "Trends, deltas, and alerts land on your dashboard — including suicidal-ideation flags that must never be missed.",
    },
  ] as const

  return (
    <section
      className={cn(
        "border-b",
        tone === "light"
          ? "border-border bg-background"
          : "border-white/10 bg-[oklch(0.12_0.03_255)]",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <h2
          className={cn(
            "max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance",
            tone === "dark" && "text-white",
          )}
        >
          From questionnaire to clinical signal
        </h2>
        <p
          className={cn(
            "mt-3 max-w-prose text-sm leading-relaxed text-pretty",
            tone === "light" ? "text-muted-foreground" : "text-white/60",
          )}
        >
          Built for solo and small-practice clinicians who need the score between
          sessions — not another IT project.
        </p>
        <ol className="mt-12 grid gap-0 border-t md:grid-cols-3 md:border-t-0 md:border-l-0">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={cn(
                "border-b py-8 md:border-b-0 md:border-l md:px-8 md:py-0 md:first:border-l-0 md:first:pl-0",
                tone === "light" ? "border-border" : "border-white/10",
              )}
            >
              <p
                className={cn(
                  "font-mono text-xs",
                  tone === "light" ? "text-primary" : "text-[oklch(0.55_0.16_250)]",
                )}
              >
                Step {i + 1}
              </p>
              <h3
                className={cn(
                  "mt-3 text-lg font-semibold tracking-[-0.015em]",
                  tone === "dark" && "text-white",
                )}
              >
                {step.title}
              </h3>
              <p
                className={cn(
                  "mt-2 text-sm leading-relaxed text-pretty",
                  tone === "light" ? "text-muted-foreground" : "text-white/60",
                )}
              >
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function PrivacyTrust({ tone = "light" }: { tone?: "light" | "dark" }) {
  const points = [
    {
      title: "Consent-first identity",
      body: "Patients stay anonymous by default. Identity is collected only with explicit consent, per link.",
    },
    {
      title: "Single-use links",
      body: "Assessment links are single-use and time-bound so access stays tight to the clinical moment.",
    },
    {
      title: "Decision support, not judgment",
      body: "APAS surfaces scores and severity. Clinical judgment stays with the licensed clinician.",
    },
  ] as const

  return (
    <section
      className={cn(
        "border-b",
        tone === "light"
          ? "border-border bg-muted/35"
          : "border-white/10 bg-[oklch(0.14_0.03_255)]",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
        <h2
          className={cn(
            "max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance",
            tone === "dark" && "text-white",
          )}
        >
          Trust is part of the instrument
        </h2>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {points.map((p) => (
            <div key={p.title}>
              <h3
                className={cn(
                  "text-base font-semibold tracking-[-0.01em]",
                  tone === "dark" && "text-white",
                )}
              >
                {p.title}
              </h3>
              <p
                className={cn(
                  "mt-2 text-sm leading-relaxed text-pretty",
                  tone === "light" ? "text-muted-foreground" : "text-white/60",
                )}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function SelectVariantBar({
  active,
  tone = "light",
}: {
  active: LandingVariantId
  tone?: "light" | "dark"
}) {
  const label = LANDING_VARIANTS.find((v) => v.id === active)?.title ?? active
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 border-t backdrop-blur-md",
        tone === "light"
          ? "border-border bg-background/92"
          : "border-white/10 bg-[oklch(0.12_0.03_255)]/92",
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          className={cn(
            "text-sm",
            tone === "light" ? "text-muted-foreground" : "text-white/65",
          )}
        >
          Viewing full page{" "}
          <span
            className={cn(
              "font-semibold",
              tone === "light" ? "text-foreground" : "text-white",
            )}
          >
            {active.toUpperCase()} · {label}
          </span>
          . Scroll the whole page, then pick.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <CompareSwitcher active={active} tone={tone === "light" ? "light" : "dark"} />
          <Button asChild size="sm" variant={tone === "light" ? "default" : "secondary"}>
            <Link href={`/compare?pick=${active}`}>Choose {active.toUpperCase()}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
