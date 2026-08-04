"use client"

import type { MembershipRole } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ROLE_LABELS } from "@/lib/roles"
import { RevokeInvitationButton } from "@/components/team/member-actions"

export type PendingInvitationView = {
  id: string
  email: string
  role: MembershipRole
  expiresAt: string
  createdAt: string
  invitedBy: { name: string | null; email: string | null } | null
}

export function PendingInvitationsTable({
  invitations,
}: {
  invitations: PendingInvitationView[]
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="w-[1%]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-medium">{inv.email}</TableCell>
            <TableCell>{ROLE_LABELS[inv.role]}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(inv.expiresAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </TableCell>
            <TableCell>
              <RevokeInvitationButton
                invitationId={inv.id}
                email={inv.email}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
