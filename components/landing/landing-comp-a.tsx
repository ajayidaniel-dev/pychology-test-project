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
 * THESIS: Between sessions, the room is quiet — severity is the only loud voice.
 * OWN-WORLD: Cool photographic consulting room, Overwatch restraint, Clinical Blue
 * actions, severity red only as risk.
 * STORY: Full clinician journey — problem, proof, how it works, privacy, close.
 * FIRST VIEWPORT: Full-bleed room; APAS; attention headline; Sign up + Log in.
 * FORM: Quiet room / Comp A full-bleed; seed 4d19dac7.
 */

export function LandingCompA() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative isolate min-h-[100svh] text-white">
        <Image
          src="/landing/apas-asset-hero-quiet-room.png"
          alt="Quiet consulting room between sessions — desk, empty chair, cool daylight"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/20"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/35"
          aria-hidden
        />

        <LandingChrome active="a" tone="over-photo" showThemeToggle={false} />

        <section className="relative z-10 mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-6xl flex-col justify-end px-6 pb-16 pt-20 sm:pb-24 sm:pt-28">
          <div className="landing-hero-rise max-w-xl">
            <p className="font-mono text-xs tracking-[0.12em] text-white/65">
              APAS · CLINICAL OVERWATCH
            </p>
            <h1 className="mt-4 text-balance text-[clamp(2.5rem,1.4rem+4vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.03em]">
              Focus on who needs you most, now.
            </h1>
            <p className="mt-6 max-w-md text-pretty text-base leading-relaxed text-white/78 sm:text-lg">
              APAS turns psychology questionnaires into clinical signal — scored on
              submit, tracked over time, alerted when a threshold is crossed.
            </p>
            <div className="mt-10">
              <LandingAuthActions size="lg" ghostOnPhoto />
            </div>
            <p className="mt-10 font-mono text-xs tracking-[0.08em] text-white/45">
              Scroll for the full story ↓
            </p>
          </div>
        </section>
      </div>

      {/* Problem */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance sm:text-3xl">
              Paper scoring still sits on the desk between sessions.
            </h2>
            <p className="mt-5 max-w-prose text-base leading-relaxed text-muted-foreground text-pretty">
              You already know the instruments. What fails is the gap: mental math
              after a full day, a missed delta, a threshold that should have been
              loud. APAS is the overwatch for that gap — for solo and small-practice
              clinicians who are not an IT department.
            </p>
          </div>
          <dl className="h-fit border-t border-border font-mono text-xs sm:border-t-0 sm:border-l sm:pl-10">
            {[
              ["Audience", "Licensed clinicians"],
              ["Instruments", "PHQ-9 · GAD-7 · BDI-II"],
              ["Custom scales", "Unlimited"],
              ["Scoring", "On submit"],
              ["Links", "Single-use · 72 h"],
              ["Identity", "Consent-only"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-baseline justify-between gap-4 border-b border-border py-3"
              >
                <dt className="tracking-[0.06em] text-muted-foreground">{k}</dt>
                <dd className="text-right text-primary">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <InstrumentStrip />

      {/* Proof: caseload */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
              The score. The delta. The threshold.
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
              Open the caseload and severity wins the glance. Critical rows carry
              the only loud color in the system — because a clinician should look
              there first.
            </p>
            <ul className="mt-8 space-y-4 text-sm">
              {[
                ["Instant scoring", "Severity classified the moment a patient submits."],
                ["Longitudinal trends", "Score, delta, and direction on every timeline."],
                ["Unmissable alerts", "Threshold crossings reach the dashboard and notifications."],
                ["Consent-first links", "Patients stay anonymous until they choose otherwise."],
              ].map(([title, body]) => (
                <li
                  key={title}
                  className="border-t border-border pt-4 first:border-t-0 first:pt-0"
                >
                  <p className="font-semibold tracking-[-0.01em]">{title}</p>
                  <p className="mt-1 text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
          <SyntheticCaseload />
        </div>
      </section>

      {/* Lived scenes */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="max-w-xl text-2xl font-semibold tracking-[-0.025em] text-balance">
            Built for the gap between sessions
          </h2>
          <div className="mt-12 grid gap-16">
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <StoryBeatImage
                src="/landing/apas-asset-send-link.png"
                alt="Clinician desk with notebook and sealed assessment envelope"
              />
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-balance">
                  Send a link. Stop scoring by hand.
                </h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
                  Patients receive a secure, single-use assessment. PHQ-9, GAD-7,
                  BDI-II, or your own scale — scored the moment they submit against
                  published cut-scores.
                </p>
              </div>
            </div>
            <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
              <div className="lg:order-2">
                <StoryBeatImage
                  src="/landing/apas-asset-between-sessions.png"
                  alt="Empty therapy chair by a window between sessions"
                />
              </div>
              <div className="lg:order-1">
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-balance">
                  See who needs you before the next chair fills.
                </h3>
                <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
                  Every assessment lands on the patient timeline. Answer “who needs
                  my attention right now?” in under ten seconds — without digging
                  through paper or spreadsheets.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Longitudinal + alert story */}
      <section className="border-b border-border">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
          <SyntheticTimeline />
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-balance">
              Change should be visible. Crisis should be loud.
            </h2>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground text-pretty">
              Longitudinal trends show direction before a session. When a threshold
              is crossed — including suicidal-ideation flags — APAS surfaces the
              signal on the dashboard and by notification. Severity is never
              decoration.
            </p>
          </div>
        </div>
      </section>

      <HowItWorks />
      <PrivacyTrust />
      <ClosingCta />
      <LandingFooter />
      <SelectVariantBar active="a" />
    </div>
  )
}
