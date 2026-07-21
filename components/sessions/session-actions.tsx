"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Ban, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
function toLocalInputValue(date: Date): string {
  const offset = new Date(date).getTimezoneOffset() * 60_000
  return new Date(new Date(date).getTime() - offset).toISOString().slice(0, 16)
}

interface SessionActionsProps {
  patientId: string
  sessionId: string
  title: string
  reason: string | null
  scheduledAt: Date
  status: string
  linkExpired: boolean
}

export function SessionActions({
  patientId,
  sessionId,
  title,
  reason,
  scheduledAt,
  status,
  linkExpired,
}: SessionActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftReason, setDraftReason] = useState(reason ?? "")
  const [draftDate, setDraftDate] = useState(() => toLocalInputValue(scheduledAt))
  const [busy, setBusy] = useState(false)

  const endpoint = `/api/patients/${patientId}/sessions/${sessionId}`

  async function patch(payload: Record<string, unknown>, successMessage: string) {
    setBusy(true)
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setBusy(false)
    if (!res.ok) {
      toast.error("Couldn't update this session.")
      return false
    }
    toast.success(successMessage)
    router.refresh()
    return true
  }

  async function onSaveEdit() {
    const ok = await patch(
      {
        title: draftTitle.trim(),
        reason: draftReason.trim() || null,
        scheduledAt: new Date(draftDate).toISOString(),
      },
      "Session updated",
    )
    if (ok) setEditOpen(false)
  }

  async function onDelete() {
    setBusy(true)
    const res = await fetch(endpoint, { method: "DELETE" })
    if (!res.ok) {
      setBusy(false)
      toast.error("Couldn't delete this session.")
      return
    }
    toast.success("Session deleted")
    router.push(`/patients/${patientId}`)
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9"
            aria-label="Session actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit details
          </DropdownMenuItem>
          {linkExpired && (
            <DropdownMenuItem
              onClick={() =>
                patch({ renewLink: true }, "Link renewed for another 72 hours")
              }
            >
              <Link2 className="size-4" />
              Renew fill link
            </DropdownMenuItem>
          )}
          {status !== "CANCELLED" && (
            <DropdownMenuItem
              onClick={() => patch({ status: "CANCELLED" }, "Session cancelled")}
            >
              <Ban className="size-4" />
              Cancel session
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete session
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit session</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-title">Title</Label>
              <Input
                id="edit-session-title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-date">Date and time</Label>
              <Input
                id="edit-session-date"
                type="datetime-local"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-session-reason">
                Reason{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="edit-session-reason"
                value={draftReason}
                onChange={(e) => setDraftReason(e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={onSaveEdit}
              disabled={!draftTitle.trim() || !draftDate || busy}
              className="w-full sm:w-auto"
            >
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the session along with every questionnaire
              in it, their responses, and their notes. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
