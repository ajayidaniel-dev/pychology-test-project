import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Secure Questionnaire",
  robots: "noindex",
}

// FillShell is rendered by the pages themselves (not here) because the
// [token] page personalizes the shell with the sending clinician's name,
// and layouts can't receive page data.
export default function FillLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  )
}
