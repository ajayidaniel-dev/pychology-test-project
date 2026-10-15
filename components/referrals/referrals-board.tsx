"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { ReferralPriority, ReferralStatus } from "@prisma/client"
import { usePracticeHref } from "@/components/layout/practice-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export type ReferralView = {
  id: string
  status: ReferralStatus
  priority: ReferralPriority
  reason: string
  summary: string | null
  createdAt: string
  patient: { id: string; displayName: string; anonymousId: string }
  sourceArea: { id: string; name: string } | null
  targetArea: { id: string; name: string } | null
  targetUser: { id: string; name: string | null; email: string | null } | null
  createdBy: { id: string; name: string | null; email: string | null }
  acceptedBy: { id: string; name: string | null; email: string | null } | null
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
  DRAFTED: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
}

export function ReferralsBoard({
  inbox,
  outbox,
  history,
}: {
  inbox: ReferralView[]
  outbox: ReferralView[]
  history: ReferralView[]
}) {
  return (
    <Tabs defaultValue="inbox">
      <TabsList>
        <TabsTrigger value="inbox">
          Inbox
          {inbox.length > 0 && (
            <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
              {inbox.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="outbox">Outbox</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="inbox" className="mt-4">
        <ReferralTable rows={inbox} mode="inbox" />
      </TabsContent>
      <TabsContent value="outbox" className="mt-4">
        <ReferralTable rows={outbox} mode="outbox" />
      </TabsContent>
      <TabsContent value="history" className="mt-4">
        <ReferralTable rows={history} mode="history" />
      </TabsContent>
    </Tabs>
  )
}

function ReferralTable({
  rows,
  mode,
}: {
  rows: ReferralView[]
  mode: "inbox" | "outbox" | "history"
}) {
  const href = usePracticeHref()

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {mode === "inbox"
          ? "No referrals waiting for you."
          : mode === "outbox"
            ? "You have not sent any referrals yet."
            : "No completed or declined referrals yet."}
      </p>
    )
  }

  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>{mode === "history" ? "From" : "To"}</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            {mode !== "history" && <TableHead className="w-[1%]" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <Link
                  href={href(`/patients/${r.patient.id}`)}
                  className="font-medium hover:underline"
                >
                  {r.patient.displayName || r.patient.anonymousId}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {r.reason}
                </p>
                {mode === "history" && r.summary && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    Summary: {r.summary}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {mode === "history"
                  ? (r.createdBy.name ?? r.createdBy.email ?? "—")
                  : (r.targetUser?.name ??
                    r.targetUser?.email ??
                    r.targetArea?.name ??
                    "—")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{STATUS_LABEL[r.status]}</Badge>
              </TableCell>
              <TableCell className="text-sm capitalize">
                {r.priority.toLowerCase().replace("_", " ")}
              </TableCell>
              {mode !== "history" && (
                <TableCell>
                  <ReferralActions referral={r} mode={mode} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ReferralActions({
  referral,
  mode,
}: {
  referral: ReferralView
  mode: "inbox" | "outbox"
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [summary, setSummary] = useState("")

  async function act(action: string, body?: { summary?: string }) {
    setPending(true)
    const res = await fetch(`/api/referrals/${referral.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    })
    const data = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(data.error ?? "Action failed")
      return
    }
    toast.success("Updated")
    setCompleteOpen(false)
    router.refresh()
  }

  if (mode === "outbox" && referral.status === "DRAFTED") {
    return (
      <Button size="sm" disabled={pending} onClick={() => act("send")}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            Sending…
          </>
        ) : (
          "Send"
        )}
      </Button>
    )
  }

  if (mode === "inbox" && referral.status === "SENT") {
    return (
      <div className="flex gap-1">
        <Button size="sm" disabled={pending} onClick={() => act("accept")}>
          {pending ? <Loader2 className="animate-spin" /> : "Accept"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => act("decline")}
        >
          Decline
        </Button>
      </div>
    )
  }

  if (
    mode === "inbox" &&
    (referral.status === "ACCEPTED" || referral.status === "IN_PROGRESS")
  ) {
    return (
      <>
        {referral.status === "ACCEPTED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => act("start")}
            className="mr-1"
          >
            {pending ? <Loader2 className="animate-spin" /> : "Start"}
          </Button>
        )}
        <Button size="sm" disabled={pending} onClick={() => setCompleteOpen(true)}>
          Complete
        </Button>
        <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete referral</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="summary">Summary for the referrer</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setCompleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={pending || !summary.trim()}
                onClick={() => act("complete", { summary })}
              >
                {pending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Completing…
                  </>
                ) : (
                  "Complete"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return null
}
