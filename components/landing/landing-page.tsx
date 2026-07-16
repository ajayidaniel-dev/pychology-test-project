import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

const CAPABILITIES = [
  {
    title: "Instant scoring",
    description:
      "Standardized instruments are scored the moment a patient submits, with severity classified against published thresholds.",
    datum: "PHQ-9 · GAD-7 · BDI-II",
  },
  {
    title: "Longitudinal trends",
    description:
      "Every assessment lands on the patient's timeline — score, delta, and direction visible at a glance.",
    datum: "score · Δ · threshold",
  },
  {
    title: "Alerts that can't be missed",
    description:
      "Threshold crossings and suicidal-ideation flags surface immediately on the dashboard and by notification.",
    datum: "<1 s to signal",
  },
  {
    title: "Consent-first privacy",
    description:
      "Patients stay anonymous by default. Identity and contact details are collected only with the patient's explicit consent, when you enable it for a link.",
    datum: "consent, per link",
  },
] as const

const STEPS = [
  {
    title: "Create a patient",
    description:
      "Add a patient record — anonymous ID by default, personal details only with consent.",
  },
  {
    title: "Send a secure link",
    description:
      "Single-use, expiring assessment links for any instrument in your library.",
  },
  {
    title: "Scored on submit",
    description:
      "Responses are scored instantly and placed on the patient's severity timeline.",
  },
  {
    title: "Act on alerts",
    description:
      "Threshold crossings and ideation flags reach you the moment they happen.",
  },
] as const

function ApasMark({ onNavy = false }: { onNavy?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <span
        className={
          onNavy
            ? "flex h-9 w-9 items-center justify-center rounded-[10px] bg-sidebar-primary/15 text-[13px] font-bold text-sidebar-primary ring-1 ring-inset ring-sidebar-primary/25"
            : "flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-[13px] font-bold text-primary ring-1 ring-inset ring-primary/20"
        }
      >
        A
      </span>
      <span
        className={`font-mono text-xs tracking-[0.08em] ${
          onNavy ? "text-auth-panel-muted" : "text-muted-foreground"
        }`}
      >
        <span
          className={`font-semibold ${
            onNavy ? "text-auth-panel-foreground" : "text-foreground"
          }`}
        >
          APAS
        </span>{" "}
        · CLINICAL OVERWATCH
      </span>
    </span>
  )
}

/*
 * Severity-trend hero motif: a longitudinal score line crossing a dashed
 * clinical threshold. The one point above the threshold carries the only
 * severity color on the page — it depicts the alert being raised, which is
 * exactly what the Severity Monopoly Rule reserves that color for.
 */
function HeroTrend() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-48 w-full text-sidebar-primary sm:h-64"
      viewBox="0 0 960 280"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
    >
      <line
        x1="0"
        y1="96"
        x2="960"
        y2="96"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeDasharray="3 8"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d="M0 200 L96 188 L192 196 L288 164 L384 172 L480 140 L576 148 L672 108 L768 72 L864 84 L960 60 L960 280 L0 280 Z"
        fill="currentColor"
        fillOpacity="0.05"
      />
      <path
        d="M0 200 L96 188 L192 196 L288 164 L384 172 L480 140 L576 148 L672 108 L768 72 L864 84 L960 60"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      {[
        [96, 188],
        [288, 164],
        [480, 140],
        [672, 108],
      ].map(([x, y]) => (
        <circle
          key={x}
          cx={x}
          cy={y}
          r="3"
          fill="var(--auth-panel)"
          stroke="currentColor"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <circle
        className="landing-alert-pulse"
        cx="768"
        cy="72"
        r="4"
        fill="none"
        stroke="var(--severity-critical)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx="768"
        cy="72"
        r="4"
        fill="var(--severity-critical)"
        stroke="var(--auth-panel)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero — the navy anchor, continuous with the auth panel identity */}
      <section className="relative overflow-hidden bg-auth-panel">
        <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 pt-6">
          <ApasMark onNavy />
          <div className="flex items-center gap-2">
            {/* The toggle sits on navy in both themes; force panel-foreground ink */}
            <span className="text-auth-panel-foreground [&_button:hover]:bg-auth-panel-foreground/10 [&_button:hover]:text-auth-panel-foreground">
              <ThemeToggle />
            </span>
            <Button
              asChild
              variant="outline"
              className="hidden border-auth-panel-foreground/25 bg-transparent text-auth-panel-foreground hover:bg-auth-panel-foreground/10 hover:text-auth-panel-foreground dark:border-auth-panel-foreground/25 dark:bg-transparent dark:hover:bg-auth-panel-foreground/10 sm:inline-flex"
            >
              <Link href="/auth/signin">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Sign up</Link>
            </Button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-56 pt-20 sm:pb-72 sm:pt-28">
          <h1 className="max-w-2xl text-balance text-[clamp(2.25rem,1.5rem+3vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.025em] text-auth-panel-foreground">
            From patient questionnaire to clinical signal in seconds
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-[15px] leading-relaxed text-auth-panel-muted sm:text-base">
            APAS scores standardized psychology instruments the moment a
            patient submits — classifies severity against published
            thresholds, tracks it over time, and raises the alerts you cannot
            afford to miss.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/signup">Create your account</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-auth-panel-foreground/25 bg-transparent text-auth-panel-foreground hover:bg-auth-panel-foreground/10 hover:text-auth-panel-foreground dark:border-auth-panel-foreground/25 dark:bg-transparent dark:hover:bg-auth-panel-foreground/10"
            >
              <Link href="/auth/signin">Log in</Link>
            </Button>
          </div>
          <p className="mt-8 font-mono text-xs tracking-[0.02em] text-auth-panel-muted">
            PHQ-9 · GAD-7 · BDI-II · custom scales
          </p>
        </div>

        <HeroTrend />
      </section>

      {/* Capabilities — the auth panel's data-ledger grammar, on the workspace field */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
        <h2 className="text-2xl font-semibold tracking-[-0.025em]">
          Built for the working caseload
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Solo and small-practice clinicians use APAS between sessions, on
          whatever device is at hand. No training, no setup project — the
          score, the delta, and the threshold in one glance.
        </p>

        <div className="mt-12 flex flex-col">
          {CAPABILITIES.map(({ title, description, datum }) => (
            <div
              key={title}
              className="flex flex-col gap-2 border-t py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
            >
              <div className="max-w-xl">
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="mt-1 text-[13px] leading-normal text-muted-foreground">
                  {description}
                </p>
              </div>
              <span className="whitespace-nowrap font-mono text-xs tracking-[0.02em] text-primary">
                {datum}
              </span>
            </div>
          ))}
          <div className="border-t" />
        </div>
      </section>

      {/* How it works — a real sequence, so the numbers carry information */}
      <section className="border-t bg-card">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
          <h2 className="text-2xl font-semibold tracking-[-0.025em]">
            How it works
          </h2>
          <ol className="mt-12 grid list-none grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ title, description }, i) => (
              <li key={title}>
                <span className="font-mono text-xs text-primary">
                  {i + 1} / 4
                </span>
                <h3 className="mt-3 text-sm font-medium">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-normal text-muted-foreground">
                  {description}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-16 flex flex-col items-start gap-6 border-t pt-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-base font-semibold tracking-tight">
                Start monitoring your caseload today.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Decision support for licensed clinicians. Not a substitute for
                clinical judgment.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/auth/signup">Create your account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 APAS · Clinical Overwatch</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              href="/legal/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy policy
            </Link>
            <Link
              href="/legal/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms of service
            </Link>
            <Link
              href="/legal/retention"
              className="transition-colors hover:text-foreground"
            >
              Data retention
            </Link>
            <Link
              href="/auth/signin"
              className="transition-colors hover:text-foreground"
            >
              Log in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
