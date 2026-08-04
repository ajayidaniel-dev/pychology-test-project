"use client"

import type { MembershipRole, MembershipStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROLE_LABELS } from "@/lib/roles"
import { MemberRoleSelect, OffboardMemberButton } from "@/components/team/member-actions"

export type TeamMemberView = {
  id: string
  role: MembershipRole
  status: MembershipStatus
  joinedAt: string
  leftAt: string | null
  user: { id: string; name: string | null; email: string | null }
  patientCount: number
  isSelf: boolean
}

const STATUS_LABEL: Record<MembershipStatus, string> = {
  ACTIVE: "Active",
  INVITED: "Invited",
  SUSPENDED: "Suspended",
  DEPARTED: "Departed",
}

export function TeamMembersTable({
  members,
  actorRole,
}: {
  members: TeamMemberView[]
  actorRole: MembershipRole
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Patients</TableHead>
          <TableHead className="w-[1%]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((m) => {
          const name = m.user.name ?? m.user.email ?? "Unknown"
          const canEditRole =
            m.status === "ACTIVE" &&
            m.role !== "OWNER" &&
            !(actorRole === "ADMIN" && m.role === "ADMIN")
          // Owners may remove another owner when a spare remains (API enforces
          // the last-owner guard). Admins cannot touch owners or other admins.
          const canOffboard =
            m.status === "ACTIVE" &&
            !m.isSelf &&
            (actorRole === "OWNER" ||
              (actorRole === "ADMIN" &&
                m.role !== "OWNER" &&
                m.role !== "ADMIN"))

          return (
            <TableRow key={m.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {name}
                    {m.isSelf ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (you)
                      </span>
                    ) : null}
                  </span>
                  {m.user.email && (
                    <span className="text-xs text-muted-foreground">
                      {m.user.email}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {m.status === "ACTIVE" ? (
                  <MemberRoleSelect
                    membershipId={m.id}
                    role={m.role}
                    disabled={!canEditRole}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {ROLE_LABELS[m.role]}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={m.status === "ACTIVE" ? "secondary" : "outline"}>
                  {STATUS_LABEL[m.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {m.status === "ACTIVE" ? m.patientCount : "—"}
              </TableCell>
              <TableCell>
                {canOffboard && (
                  <OffboardMemberButton
                    membershipId={m.id}
                    memberName={name}
                    patientCount={m.patientCount}
                  />
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
