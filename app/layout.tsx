import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: "APAS · Clinical Overwatch",
    template: "%s · APAS",
  },
  description:
    "Professional tool for converting psychology questionnaire responses to numerical scores",
  openGraph: {
    title: "APAS · Clinical Overwatch",
    description:
      "Clinical intelligence for modern psychology practice — monitor assessments, track severity trends, and act on alerts.",
    siteName: "APAS",
    type: "website",
  },
  generator: "v0.app",
}

import { Providers } from "./providers"

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.className} ${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <Providers>
          <Suspense fallback={null}>{children}</Suspense>
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
