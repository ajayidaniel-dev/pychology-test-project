"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { stripPracticePrefix } from "@/lib/practice-path"
import { ChevronLeft } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DashboardNavbarActions } from "@/components/layout/dashboard-navbar-actions"

const SECTIONS: { prefix: string; label: string }[] = [
  { prefix: "/dashboard", label: "Dashboard" },
  { prefix: "/patients", label: "Patients" },
  { prefix: "/batches", label: "Batches" },
  { prefix: "/scales", label: "Scales" },
  { prefix: "/settings", label: "Settings" },
]

interface Location {
  section: string
  sectionHref: string
  /** Set when the route is nested below its section index. */
  isDetail: boolean
}

function resolveLocation(pathname: string): Location {
  // Matched against the practice-relative path: the pathname now carries a
  // /p/<slug> prefix that no section constant knows about.
  const relative = stripPracticePrefix(pathname)
  const match = SECTIONS.find(
    (s) => relative === s.prefix || relative.startsWith(`${s.prefix}/`),
  )
  if (!match) {
    return { section: "APAS", sectionHref: "/dashboard", isDetail: false }
  }
  return {
    section: match.label,
    sectionHref: match.prefix,
    isDetail: relative !== match.prefix,
  }
}

/**
 * Persistent chrome: where you are, and one move back up.
 *
 * Deliberately not an <h1> — PageHeader renders the page heading, and two h1s
 * gave assistive tech two competing document titles. Detail routes get a real
 * back link to their section rather than only a label, because the record's own
 * name is already rendered by the page below.
 */
export function DashboardHeader() {
  const pathname = usePathname()
  const practiceHref = usePracticeHref()
  const { section, sectionHref, isDetail } = resolveLocation(pathname)

  return (
    <header className="sticky top-0 z-(--z-sticky) flex h-14 shrink-0 items-center gap-2 overflow-visible border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/75 md:px-6">
      <SidebarTrigger className="-ml-1 size-9 md:hidden" />
      <Separator orientation="vertical" className="mr-1 h-4 md:hidden" />

      <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1">
        {isDetail ? (
          // Just the way back. The record's own name is rendered by the page's
          // PageHeader directly below, so a second crumb here could only be a
          // placeholder — and a breadcrumb reading "Detail" is worse than none.
          <Link
            href={practiceHref(sectionHref)}
            className="-ml-1.5 inline-flex items-center gap-0.5 rounded-md py-1 pr-2 pl-1 text-sm font-medium text-muted-foreground transition-colors duration-150 ease-out-quart hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            Back to {section}
          </Link>
        ) : (
          <span className="min-w-0 truncate text-sm font-semibold" aria-current="page">
            {section}
          </span>
        )}
      </nav>

      <DashboardNavbarActions />
    </header>
  )
}
