import Image from "next/image"

import {
  ClosingCta,
  HowItWorks,
  InstrumentStrip,
  LandingAuthActions,
  LandingChrome,
  LandingFooter,
  PrivacyTrust,
  SelectVariantBar,
  StoryBeatImage,
  SyntheticCaseload,
  SyntheticTimeline,
} from "@/components/landing/landing-shared"

/*
 * THESIS: Split the lived scene from the clinical question — proof follows early.
 * OWN-WORLD: Quiet room photography + Cool Mist panel; severity only in mocks.
 * STORY: Full page — question, triage, life better, how it works, privacy, close.
 * FIRST VIEWPORT: Photo left / copy+CTA right.
 * FORM: Quiet room / Comp B split + triage.
 */

export function LandingCompB() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingChrome active="b" tone="light" />

      {/* Hero split */}
      <section className="border-b border-border">
        <div className="mx-auto grid min-h-[calc(100svh-4.5rem)] w-full max-w-6xl lg:grid-cols-2">
          <div className="relative min-h-[42vh] border-b border-border lg:min-h-0 lg:border-b-0 lg:border-r">
            <Image
              src="/landing/apas-asset-between-sessions.png"
              alt="Empty therapy chair in a quiet consulting room"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>

          <div className="flex flex-col justify-center px-6 py-14 sm:px-10 sm:py-20 lg:px-14">
            <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground">
              APAS · CLINICAL OVERWATCH
            </p>
            <h1 className="mt-5 max-w-lg text-balance text-[clamp(2.25rem,1.2rem+3.5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Who needs my attention right now?
            </h1>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-muted-foreground">
              APAS scores standardized instruments on submit, tracks severity over
              time, and raises alerts clinicians can’t miss — including
              suicidal-ideation flags.
            </p>
            <div className="mt-10">
              <LandingAuthActions size="lg" />
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-8 font-mono text-xs">
              {[
                ["Instruments", "PHQ-9 · GAD-7 · BDI-II"],
                ["Scoring", "On submit"],
                ["Links", "Single-use · 72 h"],
                ["Identity", "Consent-only"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="tracking-[0.06em] text-muted-foreground">{k}</dt>
                  <dd className="mt-1 text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 font-mono text-xs tracking-[0.08em] text-muted-foreground">
              Full page below ↓
            </p>
          </div>
        </div>
      </section>

      {/* Early proof */}
      <section className="border-b border-border bg-muted/35">
        <div className="mx-auto w-full max-w-6xl px-6 py-14 sm:py-16">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
              Caseload triage at a glance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">
              Severity outranks everything. Critical rows must win the glance —
              synthetic demo data below, labeled honestly.
            </p>
          </div>
          <SyntheticCaseload title="Caseload triage" />
        </div>
      </section>

      <InstrumentStrip />

      {/* Life better */}
      <section className="border-b border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-2xl text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">
            How APAS makes clinical life lighter
          </h2>
          <div className="mt-12 grid gap-0 border-t border-border md:grid-cols-2">
            {[
              {
                title: "Less mental math after sessions",
                body: "Stop hand-scoring PHQ-9 and GAD-7 between patients. Classification lands the moment they submit.",
              },
              {
                title: "Trends without archaeology",
                body: "Score, delta, and direction live on every timeline — change is visible before the next appointment.",
              },
              {
                title: "Alerts that refuse to whisper",
                body: "Threshold crossings and ideation flags surface on the dashboard and by notification.",
              },
              {
                title: "Zero-training tool, mid-workday",
                body: "Standard affordances for clinicians who are domain experts — not IT departments.",
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

      {/* Scene + timeline */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <StoryBeatImage
            src="/landing/apas-asset-send-link.png"
            alt="Desk with sealed assessment materials ready to send"
          />
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
              One link out. Clinical signal back.
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
              Patients complete assessments on their own device. You keep a quiet
              room for the work only a clinician can do — APAS watches the numbers
              in between.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
              Longitudinal clarity, then a loud flag
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
              Watch severity move across weeks. When a score crosses a threshold,
              the system makes it unmissable — never cute, never decorative.
            </p>
          </div>
          <SyntheticTimeline />
        </div>
      </section>

      <HowItWorks />
      <PrivacyTrust />
      <ClosingCta />
      <LandingFooter />
      <SelectVariantBar active="b" />
    </div>
  )
}
