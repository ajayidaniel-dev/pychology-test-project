import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

/*
 * Variant A — "Specimen sheet".
 * A precision lab document: near-monochrome, hairline rules carry all
 * structure, type does all the talking. Color budget: Clinical Blue only,
 * on actions and data accents.
 */

const CAPABILITIES = [
  {
    n: "01",
    title: "Instant scoring",
    description:
      "Standardized instruments scored the moment a patient submits, severity classified against published thresholds.",
    datum: "PHQ-9 · GAD-7 · BDI-II",
  },
  {
    n: "02",
    title: "Longitudinal trends",
    description:
      "Every assessment lands on the patient's timeline — score, delta, direction.",
    datum: "score · Δ · threshold",
  },
  {
    n: "03",
    title: "Unmissable alerts",
    description:
      "Threshold crossings and suicidal-ideation flags surface immediately, on the dashboard and by notification.",
    datum: "<1 s to signal",
  },
  {
    n: "04",
    title: "Consent-first privacy",
    description:
      "Patients stay anonymous by default; identity is collected only with explicit consent, per link.",
    datum: "consent, per link",
  },
] as const

export function LandingSwiss() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          {/* The descriptor wrapped to a second line on narrow screens and
              crowded the controls; below sm the wordmark carries it alone. */}
          <span className="font-mono text-xs whitespace-nowrap tracking-[0.08em] text-muted-foreground">
            <span className="font-semibold text-foreground">APAS</span>
            <span className="hidden sm:inline"> · CLINICAL OVERWATCH</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/auth/signin">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero: type is the image */}
      <section className="border-b">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-20 sm:py-28 lg:grid-cols-[1fr_260px] lg:gap-16">
          <div>
            <h1 className="max-w-3xl text-balance text-[clamp(2.75rem,1.5rem+5vw,5rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
              The score.
              <br />
              The delta.
              <br />
              The threshold.
            </h1>
            <p className="mt-8 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
              APAS converts psychology questionnaire responses into clinical
              signal — scored on submit, tracked over time, alerted the moment
              a threshold is crossed.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/auth/signup">Create your account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/signin">Log in</Link>
              </Button>
            </div>
          </div>

          {/* Specimen metadata column */}
          <dl className="h-fit space-y-0 font-mono text-xs lg:border-l lg:pl-8">
            {[
              ["INSTRUMENTS", "PHQ-9 · GAD-7 · BDI-II"],
              ["CUSTOM SCALES", "unlimited"],
              ["SCORING", "on submit"],
              ["LINKS", "single-use · 72 h"],
              ["IDENTITY", "consent-only"],
              ["AUDIENCE", "licensed clinicians"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-b py-3 first:border-t lg:first:border-t-0"
              >
                <dt className="tracking-[0.08em] text-muted-foreground">{k}</dt>
                <dd className="text-right text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Capabilities as a ruled index */}
      <section className="border-b">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          {/* Was text-sm — smaller than the text-lg item titles it introduced,
              which inverted the hierarchy. Set as a mono eyebrow so it reads
              as a section marker rather than competing with those titles. */}
          <h2 className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
            What clinicians get
          </h2>
          <div className="mt-8">
            {CAPABILITIES.map(({ n, title, description, datum }) => (
              <div
                key={n}
                className="grid gap-2 border-t py-6 sm:grid-cols-[3rem_1fr_220px] sm:gap-6 last:border-b"
              >
                <span className="font-mono text-xs text-primary">{n}</span>
                <div className="max-w-xl">
                  <h3 className="text-lg font-semibold tracking-[-0.01em]">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                </div>
                <span className="font-mono text-xs text-muted-foreground sm:text-right">
                  {datum}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing */}
      <section>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8 px-6 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
          <div>
            <p className="text-2xl font-semibold tracking-[-0.025em]">
              Ten seconds to “who needs my attention?”
            </p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Decision support for licensed clinicians. Not a substitute for
              clinical judgment.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/auth/signup">Start now</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 APAS</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/legal/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/legal/retention" className="hover:text-foreground">
              Retention
            </Link>
            <Link href="/auth/signin" className="hover:text-foreground">
              Log in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
