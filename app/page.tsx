// app/page.tsx
import { redirect } from "next/navigation"

import { getUserContext } from "@/lib/session-context"
import { LandingOverwatch } from "@/components/landing/landing-overwatch"

export const metadata = {
  description:
    "APAS scores standardized psychology instruments the moment a patient submits — severity classification, longitudinal trends, and alerts clinicians can't miss.",
}

export default async function RootPage() {
  const ctx = await getUserContext()
  if (ctx) redirect("/dashboard")

  return <LandingOverwatch />
}
