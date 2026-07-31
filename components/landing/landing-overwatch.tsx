import Image from "next/image"
import Link from "next/link"

import {
  ClosingCta,
  HowItWorks,
  InstrumentStrip,
  LandingFooter,
  PrivacyTrust,
  SyntheticCaseload,
  SyntheticTimeline,
} from "@/components/landing/landing-shared"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

/*
 * THESIS: Navy identity frames a lived quiet room; the instrument proves itself in-frame.
 * Refuses empty-desk mood boards and SaaS feature grids — a clinician’s face and a
 * caseload mock carry the plot: who needs attention now.
 * OWN-WORLD: Overwatch Navy hero identity + Cool Mist / dark-mode workspace below;
 * Clinical Blue actions; severity red only on risk. Photographic consulting-room soul.
 * STORY: Doctor understands APAS scores, watches, and alerts — then Signs up / Logs in.
 * FIRST VIEWPORT: Photo of clinician between sessions; score/delta/threshold; CTAs;
 * synthetic Caseload in-frame.
 * FORM: Quiet room Comp C (promoted); seed 4d19dac7 · quiet-signal-room.
 */

function LandingHeader() {
  return (
    <header className="relative z-10 border-b border-white/10 bg-transparent">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link
          href="/"
          className="shrink-0 font-semibold tracking-[-0.02em] text-white"
        >
          APAS
          <span className="ml-2 hidden font-mono text-xs font-normal tracking-[0.08em] text-white/55 sm:inline">
            CLINICAL OVERWATCH
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="[&_button]:text-white [&_button]:hover:bg-white/10 [&_button]:hover:text-white">
            <ThemeToggle />
          </div>
          <Button
            asChild
            variant="ghost"
            className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href="/auth/signin">Log in</Link>
          </Button>
          <Button
            asChild
            className="bg-white text-[oklch(0.16_0.035_255)] hover:bg-white/90 dark:bg-white dark:text-[oklch(0.16_0.035_255)] dark:hover:bg-white/90"
          >
            <Link href="/auth/signup">Sign up</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

export function LandingOverwatch() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero — Overwatch Navy identity surface over lived photography */}
      <div className="relative isolate bg-[oklch(0.12_0.03_255)] text-white">
        <div className="absolute inset-0">
          <Image
            src="/landing/apas-c-hero-clinician.png"
            alt="Clinician reviewing assessments at her desk between sessions"
            fill
            priority
            className="-scale-x-100 object-cover object-[35%_center]"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-[oklch(0.12_0.03_255)]/25 dark:bg-[oklch(0.10_0.03_255)]/35"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[oklch(0.14_0.035_255)] from-0% via-[oklch(0.14_0.035_255)]/75 via-40% to-transparent to-75%"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-[oklch(0.16_0.035_255)]/55 via-transparent to-[oklch(0.12_0.03_255)]/85"
            aria-hidden
          />
        </div>

        <div className="relative z-10">
          <LandingHeader />

          <section className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-12 sm:pb-20 sm:pt-16">
            <div className="landing-hero-rise max-w-2xl">
              <h1 className="text-balance text-[clamp(2.5rem,1.3rem+4vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
                The score.
                <br />
                The delta.
                <br />
                The threshold.
              </h1>
              <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/78">
                APAS turns psychology questionnaires into clinical signal for solo and
                small-practice clinicians — scored on submit, watched over time,
                alerted when someone needs you now.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[oklch(0.16_0.035_255)] hover:bg-white/90"
                >
                  <Link href="/auth/signup">Sign up</Link>
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

            <div className="mt-12 sm:mt-16">
              <SyntheticCaseload
                variant="dark"
                title="Caseload"
                className="border-white/15 bg-[oklch(0.14_0.03_255)]/90 shadow-sm backdrop-blur-sm dark:bg-[oklch(0.12_0.03_255)]/90"
              />
            </div>
          </section>
        </div>
      </div>

      <InstrumentStrip />

      {/* Plot: life gets lighter */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">
            Built for the gap between sessions
          </h2>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
            You already know the instruments. What fails is the quiet stretch after
            the chair empties — mental math, a missed delta, a threshold that should
            have been loud. APAS watches that gap.
          </p>
          <div className="mt-12 grid gap-0 border-t border-border md:grid-cols-2">
            {[
              {
                title: "Instant scoring",
                body: "PHQ-9, GAD-7, BDI-II, or your custom scale — classified against published cut-scores the moment a patient submits.",
              },
              {
                title: "Longitudinal watch",
                body: "Every assessment adds score, delta, and direction so change is visible without spreadsheet archaeology.",
              },
              {
                title: "Unmissable alerts",
                body: "Threshold crossings and suicidal-ideation flags surface on the dashboard and by notification.",
              },
              {
                title: "Consent-first links",
                body: "Patients stay anonymous by default. Identity only with explicit consent, per single-use link.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border-b border-border py-8 md:border-r md:px-8 md:odd:pl-0 md:even:border-r-0"
              >
                <h3 className="text-lg font-semibold tracking-[-0.015em]">{item.title}</h3>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lived scenes with faces */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance">
            The quiet room stays quiet. The instrument watches.
          </h2>
          <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-10">
            <article>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                <Image
                  src="/landing/apas-c-send-clinician.png"
                  alt="Clinician sending a secure assessment link from his phone"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em]">
                Send once. Score automatically.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                Secure single-use links leave your practice. Scored severity comes
                back without hand tallies — so the room can stay for the work only
                you can do.
              </p>
            </article>
            <article>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
                <Image
                  src="/landing/apas-c-between-clinician.png"
                  alt="Clinician reviewing caseload on a tablet beside an empty therapy chair"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em]">
                Between chairs, know who escalated.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                Open the dashboard and answer “who needs my attention right now?”
                in under ten seconds — before the next session starts.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Longitudinal + severity monopoly */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
              Change should be visible. Crisis should be loud.
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
              Longitudinal signal shows direction before the next session. When
              severity crosses a threshold, red is reserved for that moment alone —
              never decoration, never mood.
            </p>
          </div>
          <SyntheticTimeline />
        </div>
      </section>

      <HowItWorks />
      <PrivacyTrust />
      <ClosingCta />
      <LandingFooter />
    </div>
  )
}
