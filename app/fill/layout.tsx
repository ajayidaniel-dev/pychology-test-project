import type { Metadata } from "next"
import { FillShell } from "@/components/questionnaire/fill-shell"

export const metadata: Metadata = {
  title: "Secure Questionnaire",
  robots: "noindex",
}

export default function FillLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <FillShell>{children}</FillShell>
    </div>
  )
}
