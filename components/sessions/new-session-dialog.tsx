"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { Plus, Copy, Check } from "lucide-react"

interface Scale {
  id: string
  name: string
  description: string | null
  isLibrary: boolean
}

export function NewSessionDialog({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scales, setScales] = useState<Scale[]>([])
  const [scaleId, setScaleId] = useState("")
  const [loading, setLoading] = useState(false)
  const [fillUrl, setFillUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetch("/api/scales")
        .then((r) => r.json())
        .then(setScales)
        .catch(() => setError("Failed to load scales"))
    }
  }, [open])

  async function onCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scaleId }),
    })
    setLoading(false)
    if (!res.ok) {
      setError("Failed to create session")
      return
    }
    const data = await res.json()
    setFillUrl(data.fillUrl)
    toast.success("Session created")
    router.refresh()
  }

  function onCopy() {
    navigator.clipboard.writeText(fillUrl!)
    setCopied(true)
    toast.success("Link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  function onClose() {
    setOpen(false)
    setFillUrl(null)
    setScaleId("")
    setError(null)
  }

  const libraryScales = scales.filter((s) => s.isLibrary)
  const myScales = scales.filter((s) => !s.isLibrary)

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) onClose()
        else setOpen(true)
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
          <DialogTitle>
            {fillUrl ? "Session created" : "New Assessment Session"}
          </DialogTitle>
        </DialogHeader>

        {fillUrl ? (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy and send to the patient. Expires in 72 hours, single use.
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <span className="flex-1 truncate text-xs text-muted-foreground">
                {fillUrl}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={onCopy}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <DialogFooter className="flex-col-reverse sm:flex-row">
              <Button onClick={onClose} className="w-full sm:w-auto">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="space-y-1">
              <Label>Scale</Label>
              <Select value={scaleId} onValueChange={setScaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a scale…" />
                </SelectTrigger>
                <SelectContent>
                  {scales.length === 0 && (
                    <SelectItem value="_loading" disabled>
                      Loading…
                    </SelectItem>
                  )}
                  {libraryScales.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Library
                      </div>
                      {libraryScales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {myScales.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Custom
                      </div>
                      {myScales.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {error && <FormErrorAlert message={error} />}
            <DialogFooter className="flex-col-reverse sm:flex-row">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={onCreate}
                disabled={!scaleId || loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Creating…" : "Create & get link"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
