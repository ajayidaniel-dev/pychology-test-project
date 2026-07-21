"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { Plus } from "lucide-react"

interface Scale {
  id: string
  name: string
  description: string | null
  isLibrary: boolean
}

export function AddQuestionnaireDialog({
  patientId,
  sessionId,
}: {
  patientId: string
  sessionId: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scales, setScales] = useState<Scale[]>([])
  const [scaleId, setScaleId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch("/api/scales")
      .then((r) => r.json())
      .then(setScales)
      .catch(() => setError("Failed to load scales"))
  }, [open])

  async function onAdd() {
    setLoading(true)
    setError(null)
    const res = await fetch(
      `/api/patients/${patientId}/sessions/${sessionId}/questionnaires`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scaleId }),
      },
    )
    setLoading(false)

    if (!res.ok) {
      setError("Failed to add questionnaire")
      return
    }

    setOpen(false)
    setScaleId("")
    toast.success("Questionnaire added")
    router.refresh()
  }

  const libraryScales = scales.filter((s) => s.isLibrary)
  const myScales = scales.filter((s) => !s.isLibrary)

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val)
        if (!val) {
          setScaleId("")
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="min-h-11 sm:min-h-0">
          <Plus className="size-4" />
          Add questionnaire
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add questionnaire</DialogTitle>
          <DialogDescription>
            It joins this session&apos;s existing link — the patient completes
            everything in one sitting.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="scale-select">Scale</Label>
            <Select value={scaleId} onValueChange={setScaleId}>
              <SelectTrigger id="scale-select">
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
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={onAdd}
              disabled={!scaleId || loading}
              className="w-full sm:w-auto"
            >
              {loading ? "Adding…" : "Add to session"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
