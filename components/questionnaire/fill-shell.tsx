import { Shield } from "lucide-react"

interface FillShellProps {
  children: React.ReactNode
}

export function FillShell({ children }: FillShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-lg items-center gap-2.5 px-4 py-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
            <Shield className="size-4 text-primary" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Secure Questionnaire</p>
            <p className="text-xs text-muted-foreground">Your responses are encrypted in transit</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">{children}</main>
    </div>
  )
}
