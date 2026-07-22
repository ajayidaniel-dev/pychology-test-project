"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Copy, Download, Link2, MoreHorizontal, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

export interface CopyableLink {
  anonymousId: string
  token: string
}

interface BatchActionsProps {
  batchId: string
  /** Only patients with something left to answer — a finished link is noise. */
  openLinks: CopyableLink[]
  expiredLinkCount: number
}

export function BatchActions({
  batchId,
  openLinks,
  expiredLinkCount,
}: BatchActionsProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  function copyAll() {
    if (openLinks.length === 0) {
      toast.error("No open links to copy.")
      return
    }
    // Same origin-at-click-time approach as CopyLinkButton, so a link copied
    // here is identical to one copied from the row.
    const text = openLinks
      .map(({ anonymousId, token }) => {
        return `${anonymousId}\t${window.location.origin}/fill/${token}`
      })
      .join("\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(
      `Copied ${openLinks.length} link${openLinks.length === 1 ? "" : "s"}`,
    )
    setTimeout(() => setCopied(false), 2000)
  }

  async function renewExpired() {
    setBusy(true)
    const res = await fetch(`/api/batches/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renewExpiredLinks: true }),
    })
    setBusy(false)
    if (!res.ok) {
      toast.error("Couldn't renew these links.")
      return
    }
    const { renewedCount } = await res.json()
    toast.success(
      `Renewed ${renewedCount} link${renewedCount === 1 ? "" : "s"} for another 72 hours`,
    )
    router.refresh()
  }

  async function onDelete() {
    setBusy(true)
    const res = await fetch(`/api/batches/${batchId}`, { method: "DELETE" })
    if (!res.ok) {
      setBusy(false)
      toast.error("Couldn't delete this batch.")
      return
    }
    toast.success("Batch deleted")
    router.push("/batches")
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyAll}
          disabled={openLinks.length === 0}
          className="min-h-11 gap-1.5 sm:min-h-0"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : `Copy ${openLinks.length} links`}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              aria-label="Batch actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <a href={`/api/batches/${batchId}/export`} download>
                <Download className="size-4" />
                Download links as CSV
              </a>
            </DropdownMenuItem>
            {expiredLinkCount > 0 && (
              <DropdownMenuItem onClick={renewExpired} disabled={busy}>
                <Link2 className="size-4" />
                Renew {expiredLinkCount} expired link
                {expiredLinkCount === 1 ? "" : "s"}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete batch
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the grouping only. Every patient keeps their session,
              their answers, and their notes — you&apos;ll still find them on
              each patient&apos;s page. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete batch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
