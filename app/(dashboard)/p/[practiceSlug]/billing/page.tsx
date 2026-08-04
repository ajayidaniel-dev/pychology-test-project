import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can, ROLE_LABELS } from "@/lib/roles"
import { practicePath } from "@/lib/practice-path"
import { countActiveSeats } from "@/lib/practices"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata: Metadata = {
  title: "Billing",
}

export default async function BillingPage() {
  const ctx = await requirePracticeContext()

  if (!can(ctx.role, "manageBilling")) {
    redirect(practicePath(ctx.practiceSlug, "/dashboard"))
  }

  const db = scopedDb(ctx)
  const [seats, members] = await Promise.all([
    countActiveSeats(ctx.practiceId),
    db.membership.findMany({
      where: { status: "ACTIVE" },
      select: {
        role: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
  ])

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        title="Billing"
        description="Seats are active memberships — a clinician in three practices costs three seats"
      />

      <div className="rounded-xl border p-6">
        <p className="text-sm text-muted-foreground">Active seats</p>
        <p className="mt-1 font-mono text-3xl font-semibold tabular-nums">
          {seats}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Payment checkout is not wired yet. Seat count is the commercial unit;
          pricing will attach here.
        </p>
        <Button className="mt-4" disabled>
          Checkout unavailable
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Seat holders</h2>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m, i) => (
                <TableRow key={`${m.user.email}-${i}`}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {m.user.name ?? m.user.email ?? "Unknown"}
                      </span>
                      {m.user.email && (
                        <span className="text-xs text-muted-foreground">
                          {m.user.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{ROLE_LABELS[m.role]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
