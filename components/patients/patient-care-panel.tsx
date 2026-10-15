"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type AreaOption = { id: string; name: string }
type MemberOption = { id: string; label: string }
type CareMember = {
  userId: string
  user: { id: string; name: string | null; email: string | null }
}

export function PatientCarePanel({
  patientId,
  areas,
  selectedAreaIds,
  careTeam,
  clinicians,
  responsibleLabel,
  canEdit,
}: {
  patientId: string
  areas: AreaOption[]
  selectedAreaIds: string[]
  careTeam: CareMember[]
  clinicians: MemberOption[]
  responsibleLabel: string
  canEdit: boolean
}) {
  const router = useRouter()
  const [areaIds, setAreaIds] = useState(selectedAreaIds)
  const [pending, setPending] = useState(false)
  const [addUserId, setAddUserId] = useState("")

  async function saveAreas(next: string[]) {
    setPending(true)
    const res = await fetch(`/api/patients/${patientId}/areas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ areaIds: next }),
    })
    setPending(false)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      toast.error(body.error ?? "Could not update areas")
      return
    }
    setAreaIds(next)
    toast.success("Areas updated")
    router.refresh()
  }

  function toggleArea(id: string) {
    if (!canEdit || pending) return
    const next = areaIds.includes(id)
      ? areaIds.filter((a) => a !== id)
      : [...areaIds, id]
    void saveAreas(next)
  }

  async function addMember() {
    if (!addUserId) return
    setPending(true)
    const res = await fetch(`/api/patients/${patientId}/care-team`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: addUserId }),
    })
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not add to care team")
      return
    }
    setAddUserId("")
    toast.success("Added to care team")
    router.refresh()
  }

  async function removeMember(userId: string) {
    setPending(true)
    const res = await fetch(
      `/api/patients/${patientId}/care-team?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    )
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not remove")
      return
    }
    toast.success("Removed from care team")
    router.refresh()
  }

  const careIds = new Set(careTeam.map((m) => m.userId))
  const addable = clinicians.filter((c) => !careIds.has(c.id))

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Responsible clinician</h3>
        <p className="text-sm text-muted-foreground">{responsibleLabel}</p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Areas</h3>
        {areas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No areas in this practice yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => {
              const on = areaIds.includes(area.id)
              return (
                <button
                  key={area.id}
                  type="button"
                  disabled={!canEdit || pending}
                  onClick={() => toggleArea(area.id)}
                  className="disabled:opacity-60"
                >
                  <Badge variant={on ? "default" : "outline"}>{area.name}</Badge>
                </button>
              )
            })}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-medium">Care team</h3>
        {careTeam.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No additional clinicians on the care team.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {careTeam.map((m) => (
              <li
                key={m.userId}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span>{m.user.name ?? m.user.email ?? "Unknown"}</span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => removeMember(m.userId)}
                  >
                    {pending ? <Loader2 className="animate-spin" /> : "Remove"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canEdit && addable.length > 0 && (
          <div className="flex gap-2">
            <Select value={addUserId} onValueChange={setAddUserId}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Add clinician" />
              </SelectTrigger>
              <SelectContent>
                {addable.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!addUserId || pending}
              onClick={addMember}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Adding…
                </>
              ) : (
                "Add"
              )}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}
