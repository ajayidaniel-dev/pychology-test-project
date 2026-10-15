import Link from "next/link"
import Image from "next/image"

import { LANDING_VARIANTS } from "@/components/landing/landing-shared"
import { Button } from "@/components/ui/button"

export const metadata = {
  title: "Compare landing variants",
  description: "Full A / B / C landing pages for APAS — scroll each, then choose.",
}

const PREVIEWS: Record<(typeof LANDING_VARIANTS)[number]["id"], string> = {
  a: "/landing/apas-asset-hero-quiet-room.png",
  b: "/landing/apas-asset-between-sessions.png",
  c: "/landing/apas-asset-hero-quiet-room.png",
}

export default function CompareIndexPage({
  searchParams,
}: {
  searchParams?: { pick?: string }
}) {
  const pick = searchParams?.pick?.toLowerCase()
  const chosen = LANDING_VARIANTS.find((v) => v.id === pick)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="font-mono text-xs tracking-[0.1em] text-muted-foreground">
              APAS · LANDING COMPARE
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.02em]">
              Pick a full landing page
            </h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Current home</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-16">
        {chosen ? (
          <div className="mb-10 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
            <p className="text-sm font-semibold tracking-[-0.01em]">
              You chose {chosen.id.toUpperCase()} · {chosen.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tell me in chat to promote this to the homepage (replace LandingSwiss),
              or open another variant to keep comparing.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={chosen.href}>Review {chosen.id.toUpperCase()} again</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/compare">Clear choice</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Each link opens a complete landing — hero, problem, instruments, caseload
          proof, lived scenes, longitudinal alert story, how it works, privacy, and
          close. Use the sticky bar at the bottom of each page to choose.
        </p>

        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {LANDING_VARIANTS.map((variant) => (
            <li
              key={variant.id}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <Link href={variant.href} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden bg-muted">
                  <Image
                    src={PREVIEWS[variant.id]}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <span className="absolute left-3 top-3 rounded bg-black/55 px-2 py-1 font-mono text-xs text-white">
                    {variant.id.toUpperCase()} · FULL PAGE
                  </span>
                </div>
                <div className="p-5">
                  <h2 className="font-semibold tracking-[-0.01em]">{variant.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{variant.summary}</p>
                  <p className="mt-4 text-sm font-medium text-primary">
                    Open full landing →
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
