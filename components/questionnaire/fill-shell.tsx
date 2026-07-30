import { Shield } from "lucide-react"

interface FillShellProps {
  children: React.ReactNode
  clinicianName?: string | null
}

export function FillShell({ children, clinicianName }: FillShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/*
        Opaque, not translucent. DESIGN.md bans glassmorphism outright — and on
        the one surface a patient sees, text sliding under a blurred bar while
        they answer questions about their mental health is the wrong kind of
        clever. Flat surface, single hairline.
      */}
      <header className="sticky top-0 z-(--z-sticky) border-b border-border bg-background">
        <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Shield className="size-4 text-primary" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Secure Questionnaire</p>
            <p className="truncate text-xs text-muted-foreground">
              {clinicianName
                ? `Sent by ${clinicianName} · encrypted in transit`
                : "Your responses are encrypted in transit"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
