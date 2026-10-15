"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { Plus } from "lucide-react"

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function NewSessionDialog({
  patientId,
  patientHasDetails = false,
}: {
  patientId: string
  patientHasDetails?: boolean
}) {
  const practiceHref = usePracticeHref()

  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [reason, setReason] = useState("")
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date()),
  )
  const [collectDetails, setCollectDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle("")
    setReason("")
    setScheduledAt(toLocalInputValue(new Date()))
    setCollectDetails(false)
    setError(null)
  }

  async function onCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        reason: reason.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        collectDetails,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      setError("Failed to create session")
      return
    }

    const created = await res.json()
    setOpen(false)
    reset()
    toast.success("Session created")
    // Land on the session so the next step — attaching questionnaires — is
    // where the clinician already is.
    router.push(practiceHref(`/patients/${patientId}/sessions/${created.id}`))
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 sm:min-h-0">
          <Plus className="size-4" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New session</DialogTitle>
          <DialogDescription>
            A session is an appointment. You&apos;ll add questionnaires to it
            next.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-title">Title</Label>
            <Input
              id="session-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Intake, Week 4 review…"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-date">Date and time</Label>
            <Input
              id="session-date"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="session-reason">
              Reason{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="session-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this session is happening"
              rows={3}
              className="resize-y"
            />
          </div>

          {patientHasDetails ? (
            <p className="text-xs text-muted-foreground">
              This patient&apos;s details are already on file — the link will
              skip identity questions.
            </p>
          ) : (
            <div className="flex items-start gap-2">
              <Checkbox
                id="collect-details"
                checked={collectDetails}
                onCheckedChange={(v) => setCollectDetails(v === true)}
                className="mt-0.5"
              />
              <div className="grid gap-0.5">
                <Label htmlFor="collect-details" className="cursor-pointer">
                  Collect patient details on this session&apos;s link
                </Label>
                <p className="text-xs text-muted-foreground">
                  After consenting, the patient is asked once for their name,
                  contact details, and a few context questions.
                </p>
              </div>
            </div>
          )}

          {error && <FormErrorAlert message={error} />}

          <DialogFooter className="flex-col-reverse sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={onCreate}
              disabled={!title.trim() || !scheduledAt || loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Creating…" : "Create session"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
