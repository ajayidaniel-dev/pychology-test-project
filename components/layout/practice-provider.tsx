"use client"

import { createContext, useCallback, useContext } from "react"
import { practicePath } from "@/lib/practice-path"
import type { PracticeOption } from "@/lib/practice"

type PracticeContextValue = {
  slug: string
  name: string
  practiceId: string
  options: PracticeOption[]
}

const PracticeCtx = createContext<PracticeContextValue | null>(null)

export function PracticeProvider({
  value,
  children,
}: {
  value: PracticeContextValue
  children: React.ReactNode
}) {
  return <PracticeCtx.Provider value={value}>{children}</PracticeCtx.Provider>
}

export function usePractice(): PracticeContextValue {
  const value = useContext(PracticeCtx)
  if (!value) {
    throw new Error("usePractice must be used inside a PracticeProvider")
  }
  return value
}

/**
 * Build a link inside the active practice.
 *
 * Client components cannot read the practice from the request, so the shell
 * hands it down and this is how they use it:
 *
 *   const href = usePracticeHref()
 *   <Link href={href(`/patients/${id}`)}>
 *
 * Server components use `practicePath(ctx.practiceSlug, …)` directly instead.
 */
export function usePracticeHref(): (path: string) => string {
  const { slug } = usePractice()
  return useCallback((path: string) => practicePath(slug, path), [slug])
}
