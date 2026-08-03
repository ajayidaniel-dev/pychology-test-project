import { NextRequest, NextResponse } from 'next/server'
import { getPracticeContext, practiceContextFailure } from '@/lib/session-context'
import { scopedDb } from '@/lib/db'
import { fillUrlFor } from '@/lib/request-origin'
import { isTokenExpired } from '@/lib/token'
import { findOwnedBatch } from '@/lib/batches'

/** RFC 4180: quote every field, double any embedded quote. */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'batch'
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } },
) {
  const ctx = await getPracticeContext()
  if (!ctx) return practiceContextFailure()
  const db = scopedDb(ctx)

  const batch = await findOwnedBatch(db, params.batchId, ctx.userId)
  if (!batch) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const header = ['anonymousId', 'displayName', 'fillUrl', 'expiresAt', 'status']

  const rows = batch.sessions.map((clinicalSession) => {
    const done =
      clinicalSession.questionnaires.length > 0 &&
      clinicalSession.questionnaires.every((q) => q.status === 'COMPLETED')
    const status = done
      ? 'completed'
      : isTokenExpired(clinicalSession.tokenExpiresAt)
        ? 'expired'
        : 'pending'

    return [
      clinicalSession.patient.anonymousId,
      clinicalSession.patient.displayName ?? '',
      fillUrlFor(req, clinicalSession.token),
      clinicalSession.tokenExpiresAt.toISOString(),
      status,
    ]
  })

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => csvCell(String(cell))).join(','))
    .join('\r\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slugify(batch.title)}-links.csv"`,
      // Live fill links — never let a proxy or the browser keep a copy.
      'Cache-Control': 'no-store, private',
    },
  })
}
