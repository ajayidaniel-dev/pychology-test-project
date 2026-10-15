"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { PatientAccessMode } from "@prisma/client"
import {
  PATIENT_ACCESS_DESCRIPTIONS,
  PATIENT_ACCESS_LABELS,
} from "@/lib/patient-access"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MODES: PatientAccessMode[] = ["OPEN", "AREA_SCOPED", "ASSIGNED_ONLY"]

export function AccessLadderCard({
  value,
  canEdit,
}: {
  value: PatientAccessMode
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function onChange(next: string) {
    if (next === value || !canEdit) return
    setPending(true)
    const res = await fetch("/api/practice/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientAccess: next }),
    })
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not update access setting")
      return
    }
    toast.success("Patient access updated")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div>
        <h2 className="text-sm font-medium">Patient access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          How far team members can see into this practice’s caseload. The
          practice boundary itself does not change.
        </p>
      </div>
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor="patient-access">Ladder</Label>
        <Select
          value={value}
          onValueChange={onChange}
          disabled={!canEdit || pending}
        >
          <SelectTrigger id="patient-access">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {PATIENT_ACCESS_LABELS[mode]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {PATIENT_ACCESS_DESCRIPTIONS[value]}
        </p>
      </div>
    </div>
  )
}
