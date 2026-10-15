import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { requirePracticeContext } from "@/lib/session-context"
import { scopedDb } from "@/lib/db"
import { can } from "@/lib/roles"
import { practicePath } from "@/lib/practice-path"
import { expireStaleInvitations } from "@/lib/invitations"
import { listMembers } from "@/lib/team"
import { listAreas } from "@/lib/areas"
import { PageHeader } from "@/components/layout/page-header"
import { EmptyState } from "@/components/layout/empty-state"
import { InviteMemberDialog } from "@/components/team/invite-member-dialog"
import { TeamMembersTable } from "@/components/team/team-members-table"
import { PendingInvitationsTable } from "@/components/team/pending-invitations-table"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Team",
}

export default async function TeamPage() {
  const ctx = await requirePracticeContext()

  // Filtered, never rendered-then-disabled — clinicians should not even know
  // the URL shape from a nav item, and a direct hit redirects home.
  if (!can(ctx.role, "manageTeam")) {
    redirect(practicePath(ctx.practiceSlug, "/dashboard"))
  }

  const db = scopedDb(ctx)
  await expireStaleInvitations(ctx.practiceId)

  const [members, invitations, areas] = await Promise.all([
    listMembers(db, ctx.practiceId),
    db.practiceInvitation.findMany({
      where: { status: "PENDING" },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    listAreas(db, ctx.practiceId),
  ])

  const activeCount = members.filter((m) => m.status === "ACTIVE").length
  const areaOptions = areas.map((a) => ({ id: a.id, name: a.name }))

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Team"
        count={activeCount}
        description="Members, roles and invitations for this practice"
        actions={<InviteMemberDialog areas={areaOptions} />}
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">Members</h2>
        {members.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No members yet"
            description="Invite a colleague to share this practice’s caseload and scheduling."
            action={
              <InviteMemberDialog
                areas={areaOptions}
                trigger={<Button>Invite first member</Button>}
              />
            }
          />
        ) : (
          <div className="rounded-xl border">
            <TeamMembersTable
              actorRole={ctx.role}
              members={members.map((m) => ({
                ...m,
                joinedAt: m.joinedAt.toISOString(),
                leftAt: m.leftAt?.toISOString() ?? null,
                isSelf: m.user.id === ctx.userId,
              }))}
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-foreground">
          Pending invitations
          {invitations.length > 0 && (
            <span className="ml-2 font-mono text-muted-foreground tabular-nums">
              {invitations.length}
            </span>
          )}
        </h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outstanding invitations.
          </p>
        ) : (
          <div className="rounded-xl border">
            <PendingInvitationsTable
              invitations={invitations.map((inv) => ({
                ...inv,
                expiresAt: inv.expiresAt.toISOString(),
                createdAt: inv.createdAt.toISOString(),
              }))}
            />
          </div>
        )}
      </section>
    </div>
  )
}
