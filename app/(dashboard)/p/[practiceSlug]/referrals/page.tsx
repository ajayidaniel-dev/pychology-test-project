import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can } from "@/lib/roles"
import { practicePath } from "@/lib/practice-path"
import { listHistory, listInbox, listOutbox } from "@/lib/referrals"
import { patientVisibilityWhere } from "@/lib/patient-access"
import { PageHeader } from "@/components/layout/page-header"
import { ReferralsBoard } from "@/components/referrals/referrals-board"
import { NewReferralDialog } from "@/components/referrals/new-referral-dialog"

export const metadata: Metadata = {
  title: "Referrals",
}

export default async function ReferralsPage() {
  const ctx = await requirePracticeContext()

  if (!can(ctx.role, "manageReferrals")) {
    redirect(practicePath(ctx.practiceSlug, "/dashboard"))
  }

  const db = scopedDb(ctx)

  const areaCount = await db.area.count()
  // Do not ship an empty referrals surface before areas exist.
  if (areaCount === 0) {
    redirect(practicePath(ctx.practiceSlug, "/areas"))
  }

  const visibility = await patientVisibilityWhere(db, ctx)

  const [inbox, outbox, history, patients, areas, members] = await Promise.all([
    listInbox(db, {
      practiceId: ctx.practiceId,
      userId: ctx.userId,
      membershipId: ctx.membershipId,
    }),
    listOutbox(db, ctx.userId),
    listHistory(db, {
      practiceId: ctx.practiceId,
      userId: ctx.userId,
      membershipId: ctx.membershipId,
    }),
    db.patient.findMany({
      where: visibility,
      select: { id: true, displayName: true, anonymousId: true },
      orderBy: { displayName: "asc" },
    }),
    db.area.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.membership.findMany({
      where: { status: "ACTIVE" },
      select: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ])

  const serialize = (rows: typeof inbox) =>
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }))

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Referrals"
        description="Internal handoffs between areas — a workflow, not a data-sharing grant"
        actions={
          <NewReferralDialog
            patients={patients.map((p) => ({
              id: p.id,
              label: p.displayName || p.anonymousId,
            }))}
            areas={areas.map((a) => ({ id: a.id, label: a.name }))}
            clinicians={members
              .filter((m) => m.user.id !== ctx.userId)
              .map((m) => ({
                id: m.user.id,
                label: m.user.name ?? m.user.email ?? "Unknown",
              }))}
          />
        }
      />

      <ReferralsBoard
        inbox={serialize(inbox)}
        outbox={serialize(outbox)}
        history={serialize(history)}
      />
    </div>
  )
}
