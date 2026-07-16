// app/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

import { authOptions } from "@/lib/auth"
import { LandingPage } from "@/components/landing/landing-page"

export const metadata = {
  description:
    "APAS scores standardized psychology instruments the moment a patient submits — severity classification, longitudinal trends, and alerts clinicians can't miss.",
}

export default async function RootPage() {
  const session = await getServerSession(authOptions)
  if (session) redirect("/dashboard")

  return <LandingPage />
}
