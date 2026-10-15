"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { practicePath } from "@/lib/practice-path"
import type { PracticeOption } from "@/lib/practice"
import type { MembershipRole, PracticeStatus } from "@prisma/client"

type SwitchingTo = {
  slug: string
  name: string
}

type PracticeContextValue = {
  slug: string
  name: string
  practiceId: string
  role: MembershipRole
  status: PracticeStatus
  options: PracticeOption[]
  /** Non-null while a practice switch navigation is in flight. */
  switchingTo: SwitchingTo | null
  beginPracticeSwitch: (next: PracticeOption) => void
}

const PracticeCtx = createContext<PracticeContextValue | null>(null)

export function PracticeProvider({
  value,
  children,
}: {
  value: Omit<
    PracticeContextValue,
    "switchingTo" | "beginPracticeSwitch"
  >
  children: React.ReactNode
}) {
  const [switchingTo, setSwitchingTo] = useState<SwitchingTo | null>(null)

  // Clear once the server has rendered the destination practice into the shell.
  useEffect(() => {
    if (switchingTo && value.slug === switchingTo.slug) {
      setSwitchingTo(null)
    }
  }, [value.slug, switchingTo])

  // Safety net if navigation fails or is cancelled.
  useEffect(() => {
    if (!switchingTo) return
    const timer = window.setTimeout(() => setSwitchingTo(null), 12_000)
    return () => window.clearTimeout(timer)
  }, [switchingTo])

  const beginPracticeSwitch = useCallback((next: PracticeOption) => {
    setSwitchingTo({ slug: next.slug, name: next.name })
  }, [])

  const ctx = useMemo(
    () => ({
      ...value,
      switchingTo,
      beginPracticeSwitch,
    }),
    [value, switchingTo, beginPracticeSwitch],
  )

  return <PracticeCtx.Provider value={ctx}>{children}</PracticeCtx.Provider>
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
