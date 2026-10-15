import Image from "next/image"
import Link from "next/link"

import {
  ClosingCta,
  HowItWorks,
  InstrumentStrip,
  LandingChrome,
  LandingFooter,
  PrivacyTrust,
  SelectVariantBar,
  SyntheticCaseload,
  SyntheticTimeline,
} from "@/components/landing/landing-shared"
import { Button } from "@/components/ui/button"

/*
 * THESIS: Navy identity frames a desk still life; the instrument proves itself in-frame.
 * OWN-WORLD: Overwatch Navy, photographic desk, dark mock with mono scores.
 * STORY: Full dark Persuade page — proof, life better, scenes, how it works, privacy.
 * FIRST VIEWPORT: Navy chrome + desk photo + headline + synthetic Caseload.
 * FORM: Quiet room / Comp C navy + caseload mock.
 */

export function LandingCompC() {
  return (
    <div className="min-h-screen bg-[oklch(0.12_0.03_255)] text-[oklch(0.97_0.008_250)]">
      {/* Hero with in-frame proof */}
      <div className="relative isolate">
        <div className="absolute inset-0 min-h-full">
          <Image
            src="/landing/apas-asset-hero-quiet-room.png"
            alt="Clinician desk still life in a quiet consulting room"
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div
            className="absolute inset-0 bg-[oklch(0.12_0.03_255)]/60"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-[oklch(0.16_0.035_255)] via-[oklch(0.12_0.03_255)]/40 to-[oklch(0.12_0.03_255)]"
            aria-hidden
          />
        </div>

        <div className="relative z-10">
          <LandingChrome active="c" tone="over-photo" showThemeToggle={false} />

          <section className="mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-14 sm:pb-20 sm:pt-20">
            <div className="max-w-2xl">
              <h1 className="text-balance text-[clamp(2.5rem,1.3rem+4vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
                The score.
                <br />
                The delta.
                <br />
                The threshold.
              </h1>
              <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/72">
                Observed with clarity. Acted on with care. APAS converts questionnaire
                responses into clinical signal for solo and small-practice clinicians.
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
              <p className="mt-10 font-mono text-xs tracking-[0.08em] text-white/40">
                Full page continues ↓
              </p>
            </div>

            <div className="mt-12 sm:mt-16">
              <SyntheticCaseload variant="dark" className="shadow-sm" />
            </div>
          </section>
        </div>
      </div>

      <InstrumentStrip tone="dark" />

      {/* Life better */}
      <section className="border-t border-white/10 bg-[oklch(0.14_0.03_255)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-[-0.025em] text-balance text-white sm:text-3xl">
            How APAS makes the day lighter
          </h2>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-white/60 text-pretty">
            Less mental math after sessions. Fewer missed threshold crossings. A
            caseload view that answers the only question that matters between
            appointments.
          </p>
          <div className="mt-12 grid gap-0 border-t border-white/10 md:grid-cols-2">
            {[
              {
                title: "Instant scoring",
                body: "Published cut-scores applied the moment a patient submits — PHQ-9, GAD-7, BDI-II, or your custom scale.",
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
                className="border-b border-white/10 py-8 md:border-r md:px-8 md:odd:pl-0 md:even:border-r-0"
              >
                <h3 className="text-lg font-semibold tracking-[-0.015em] text-white">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-white/60 text-pretty">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline proof */}
      <section className="border-t border-white/10 bg-[oklch(0.12_0.03_255)]">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance text-white">
              Change should be visible. Crisis should be loud.
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-white/60 text-pretty">
              Longitudinal signal shows direction before the next session. When
              severity crosses a threshold, red is reserved for that moment alone —
              The Severity Monopoly Rule, carried into Persuade.
            </p>
          </div>
          <SyntheticTimeline variant="dark" />
        </div>
      </section>

      {/* Photographic scenes */}
      <section className="border-t border-white/10 bg-[oklch(0.14_0.03_255)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance text-white">
            The quiet room stays quiet. The instrument watches.
          </h2>
          <div className="mt-12 grid gap-10 lg:grid-cols-2">
            <div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10">
                <Image
                  src="/landing/apas-asset-send-link.png"
                  alt="Notebook and sealed assessment envelope on a clinician desk"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-white">
                Send once. Score automatically.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60 text-pretty">
                Secure single-use links leave your practice; scored severity comes
                back without hand tallies.
              </p>
            </div>
            <div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-white/10">
                <Image
                  src="/landing/apas-asset-between-sessions.png"
                  alt="Empty therapy chair waiting between sessions"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-[-0.015em] text-white">
                Between chairs, know who escalated.
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60 text-pretty">
                Open the dashboard and answer the only question that matters before
                the next session starts.
              </p>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks tone="dark" />
      <PrivacyTrust tone="dark" />
      <ClosingCta tone="dark" />
      <LandingFooter tone="dark" />
      <SelectVariantBar active="c" tone="dark" />
    </div>
  )
}
