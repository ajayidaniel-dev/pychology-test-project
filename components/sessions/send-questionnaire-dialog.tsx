"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, Copy, Send } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { ScaleMultiPicker } from "@/components/scales/scale-multi-picker"
import type { PickableScale } from "@/components/scales/scale-multi-picker"

/**
 * Issues questionnaires to a patient with no appointment attached. The link is
 * the deliverable, so the dialog does not close on success — it hands the link
 * over first, because there is no mail provider to send it for the clinician.
 */
export function SendQuestionnaireDialog({
  patientId,
  patientHasDetails = false,
}: {
  patientId: string
  patientHasDetails?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scales, setScales] = useState<PickableScale[] | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [collectDetails, setCollectDetails] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fillUrl, setFillUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || scales) return
    fetch("/api/scales")
      .then((r) => r.json())
      .then(setScales)
      .catch(() => setError("Couldn't load scales."))
  }, [open, scales])

  function reset() {
    setSelectedIds([])
    setNote("")
    setCollectDetails(false)
    setError(null)
    setFillUrl(null)
    setCopied(false)
  }

  async function onSend() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/questionnaire-sends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scaleIds: selectedIds,
        note: note.trim() || undefined,
        collectDetails,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      setError("Couldn't send these questionnaires. Nothing was created.")
      return
    }

    const created = await res.json()
    setFillUrl(created.fillUrl)
    toast.success("Questionnaires ready to send")
    // The new send has to appear behind the dialog, not after it closes.
    router.refresh()
  }

  function copyLink() {
    if (!fillUrl) return
    navigator.clipboard.writeText(fillUrl)
    setCopied(true)
    toast.success("Link copied")
    setTimeout(() => setCopied(false), 2000)
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
        <Button size="sm" className="min-h-11 sm:min-h-0">
          <Send className="size-4" />
          Send questionnaire
        </Button>
      </DialogTrigger>

      <DialogContent>
        {fillUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Link ready</DialogTitle>
              <DialogDescription>
                Send this to the patient. It expires in 72 hours and can be
                renewed from the send&apos;s page.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-3">
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={fillUrl}
                  aria-label="Questionnaire link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="font-mono text-xs"
                />
                <Button variant="outline" onClick={copyLink} className="shrink-0">
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>

              <DialogFooter>
                <Button onClick={() => setOpen(false)} className="w-full sm:w-auto">
                  Done
                </Button>
              </DialogFooter>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Send questionnaires</DialogTitle>
              <DialogDescription>
                No appointment needed — pick the scales and you&apos;ll get a
                link to send the patient.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label>Questionnaires</Label>
                <div className="max-h-64 overflow-y-auto rounded-md border p-3">
                  {scales === null ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-36" />
                    </div>
                  ) : scales.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No scales available yet.
                    </p>
                  ) : (
                    <ScaleMultiPicker
                      scales={scales}
                      selectedIds={selectedIds}
                      onChange={setSelectedIds}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  The patient answers them in the order picked, on one link.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="send-note">
                  Note{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="send-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why these are going out"
                  rows={2}
                  className="resize-y"
                />
              </div>

              {patientHasDetails ? (
                <p className="text-xs text-muted-foreground">
                  This patient&apos;s details are already on file — the link
                  will skip identity questions.
                </p>
              ) : (
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="send-collect-details"
                    checked={collectDetails}
                    onCheckedChange={(v) => setCollectDetails(v === true)}
                    className="mt-0.5"
                  />
                  <div className="grid gap-0.5">
                    <Label
                      htmlFor="send-collect-details"
                      className="cursor-pointer"
                    >
                      Collect patient details on this link
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      After consenting, the patient is asked once for their
                      name, contact details, and a few context questions.
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
                  onClick={onSend}
                  disabled={selectedIds.length === 0 || loading}
                  className="w-full sm:w-auto"
                >
                  {loading
                    ? "Sending…"
                    : `Send ${selectedIds.length || ""}`.trim()}
                </Button>
              </DialogFooter>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
