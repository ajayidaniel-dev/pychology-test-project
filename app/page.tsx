// app/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { LandingOverwatch } from "@/components/landing/landing-overwatch"

export const metadata = {
  description:
    "APAS scores standardized psychology instruments the moment a patient submits — severity classification, longitudinal trends, and alerts clinicians can't miss.",
}

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return <LandingOverwatch />
}
