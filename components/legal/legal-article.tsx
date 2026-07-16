import Link from "next/link"

import { ThemeToggle } from "@/components/theme-toggle"

interface LegalArticleProps {
  title: string
  lastUpdated: string
  children: React.ReactNode
}

/*
 * Shared shell for the public legal documents. Prose styles live here (not a
 * typography plugin) so the three documents stay identical in voice: fixed rem
 * steps, 70ch measure, hairline separations.
 */
export function LegalArticle({
  title,
  lastUpdated,
  children,
}: LegalArticleProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-primary/10 text-xs font-bold text-primary ring-1 ring-inset ring-primary/20">
              A
            </span>
            <span className="font-mono text-xs tracking-[0.08em] text-muted-foreground">
              <span className="font-semibold text-foreground">APAS</span> ·
              CLINICAL OVERWATCH
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-14">
        <h1 className="text-2xl font-semibold tracking-[-0.025em]">{title}</h1>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          Last updated: {lastUpdated}
        </p>

        <div
          role="note"
          className="mt-8 rounded-lg border bg-muted px-4 py-3 text-[13px] leading-normal text-muted-foreground"
        >
          <span className="font-medium text-foreground">Draft.</span> This
          document is under review and not yet a binding statement. Review it
          with a qualified professional before relying on it.
        </div>

        <article className="legal-prose mt-10 max-w-[70ch]">{children}</article>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 APAS · Clinical Overwatch</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
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
          </nav>
        </div>
      </footer>
    </div>
  )
}
