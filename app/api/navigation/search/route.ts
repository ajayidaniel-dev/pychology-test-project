import { NextResponse } from "next/server"
import { getPracticeContext, practiceContextFailure } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"

export interface SearchIndex {
  /**
   * `terms` carries everything the palette should match on but not necessarily
   * display — a clinician searching "Sarah" is searching the real name, which
   * is never the visible label.
   */
  patients: { id: string; label: string; hint: string | null; terms: string }[]
  scales: { id: string; label: string }[]
  batches: { id: string; label: string; hint: string | null }[]
}

/**
 * The command palette's index.
 *
 * Fetched on first open rather than rendered into every page, so navigating the
 * app doesn't pay for a search index nobody asked for. Everything is scoped to
 * the signed-in clinician — a palette that could surface another practice's
 * patient identifiers would be a data-isolation failure, not a UI bug.
 */
export async function GET() {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const psychologistId = ctx.userId

  const [patients, scales, batches] = await Promise.all([
    db.patient.findMany({
      where: { psychologistId },
      select: {
        id: true,
        anonymousId: true,
        displayName: true,
        fullName: true,
        email: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.scale.findMany({
      where: { OR: [{ psychologistId }, { isLibrary: true }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    db.sessionBatch.findMany({
      where: { psychologistId },
      select: { id: true, title: true, scheduledAt: true },
      orderBy: { scheduledAt: "desc" },
      take: 100,
    }),
  ])

  const index: SearchIndex = {
    patients: patients.map((p) => {
      // Display names can be a real person's name, so it is a secondary hint
      // rather than the primary label — the pseudonymous id stays the handle.
      const hint =
        p.fullName ??
        (p.displayName && p.displayName !== p.anonymousId ? p.displayName : null)

      return {
        id: p.id,
        label: p.anonymousId,
        hint,
        // Email is matchable but never rendered: clinicians look people up by
        // the address they mailed the questionnaire link to.
        terms: [p.anonymousId, p.displayName, p.fullName, p.email]
          .filter(Boolean)
          .join(" "),
      }
    }),
    scales: scales.map((s) => ({ id: s.id, label: s.name })),
    batches: batches.map((b) => ({
      id: b.id,
      label: b.title,
      hint: b.scheduledAt ? b.scheduledAt.toISOString() : null,
    })),
  }

  return NextResponse.json(index, {
    headers: { "Cache-Control": "private, no-store" },
  })
}
