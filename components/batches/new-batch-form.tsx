"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { BatchCriteriaBar } from "@/components/batches/batch-criteria-bar"
import { BatchPatientPicker } from "@/components/batches/batch-patient-picker"
import { BatchScalePicker } from "@/components/batches/batch-scale-picker"
import type { BatchScale } from "@/components/batches/batch-scale-picker"
import { filterPatientsForBatch, type BatchCriteria } from "@/lib/batch-filters"
import { MAX_BATCH_PATIENTS } from "@/lib/batches"
import type { PatientListItem } from "@/lib/patient-summary"

/** `datetime-local` wants `YYYY-MM-DDTHH:mm` in local time, not an ISO string. */
function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

interface NewBatchFormProps {
  patients: PatientListItem[]
  scales: BatchScale[]
}

export function NewBatchForm({ patients, scales }: NewBatchFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [reason, setReason] = useState("")
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalInputValue(new Date()),
  )
  const [collectDetails, setCollectDetails] = useState(false)
  const [criteria, setCriteria] = useState<BatchCriteria>({})
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([])
  const [selectedScaleIds, setSelectedScaleIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matches = useMemo(
    () => filterPatientsForBatch(patients, criteria),
    [patients, criteria],
  )

  // Filtering must not silently drop people already ticked — the count on the
  // button has to keep matching what actually gets created.
  const hiddenSelectedCount = selectedPatientIds.filter(
    (id) => !matches.some((p) => p.id === id),
  ).length

  const overLimit = selectedPatientIds.length > MAX_BATCH_PATIENTS

  const canSubmit =
    title.trim().length > 0 &&
    scheduledAt.length > 0 &&
    selectedPatientIds.length > 0 &&
    selectedScaleIds.length > 0 &&
    !overLimit &&
    !loading

  async function onCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        reason: reason.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        collectDetails,
        patientIds: selectedPatientIds,
        scaleIds: selectedScaleIds,
      }),
    })
    setLoading(false)

    if (!res.ok) {
      setError("Couldn't create this batch. Nothing was sent.")
      return
    }

    const batch = await res.json()
    toast.success(
      `Batch created for ${selectedPatientIds.length} patient${
        selectedPatientIds.length === 1 ? "" : "s"
      }`,
    )
    router.push(`/batches/${batch.id}`)
  }

  if (patients.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="No patients yet"
        description="Add patients before sending a batch of questionnaires."
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <SectionHeader title="Details" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="batch-title">Title</Label>
            <Input
              id="batch-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Q3 depression re-screen…"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Every patient&apos;s session gets this title.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch-date">Date and time</Label>
            <Input
              id="batch-date"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Shared across the batch. Individual sessions stay editable
              afterwards.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch-reason">
              Reason{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="batch-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why this batch is going out"
              rows={2}
              className="resize-y"
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="batch-collect-details"
              checked={collectDetails}
              onCheckedChange={(v) => setCollectDetails(v === true)}
              className="mt-0.5"
            />
            <div className="grid gap-0.5">
              <Label
                htmlFor="batch-collect-details"
                className="cursor-pointer"
              >
                Collect patient details on these links
              </Label>
              <p className="text-xs text-muted-foreground">
                Only asked of patients who have no details on file yet — the
                rest skip straight to the questionnaires.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <SectionHeader title="Questionnaires" />
        </CardHeader>
        <CardContent>
          {scales.length === 0 ? (
            <EmptyState
              plain
              title="No scales available"
              description="Add a scale before sending a batch."
            />
          ) : (
            <BatchScalePicker
              scales={scales}
              selectedIds={selectedScaleIds}
              onChange={setSelectedScaleIds}
            />
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0 shadow-sm">
        <CardHeader className="border-b px-4 py-4 md:px-6">
          <SectionHeader title="Patients" />
        </CardHeader>

        <BatchCriteriaBar
          criteria={criteria}
          onChange={setCriteria}
          matchCount={matches.length}
          totalCount={patients.length}
        />

        <div className="px-4 pb-4 md:px-6 md:pb-6">
          <BatchPatientPicker
            patients={matches}
            selectedIds={selectedPatientIds}
            onSelectionChange={setSelectedPatientIds}
          />
        </div>
      </Card>

      {error && <FormErrorAlert message={error} />}

      {overLimit && (
        <FormErrorAlert
          message={`A batch can hold at most ${MAX_BATCH_PATIENTS} patients. Remove ${
            selectedPatientIds.length - MAX_BATCH_PATIENTS
          } to continue.`}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedPatientIds.length} patient
          {selectedPatientIds.length === 1 ? "" : "s"} ·{" "}
          {selectedScaleIds.length} questionnaire
          {selectedScaleIds.length === 1 ? "" : "s"} each
          {hiddenSelectedCount > 0 && (
            <>
              {" "}
              <span className="text-foreground">
                ({hiddenSelectedCount} hidden by filters)
              </span>
            </>
          )}
        </p>
        <Button
          onClick={onCreate}
          disabled={!canSubmit}
          className="w-full sm:w-auto"
        >
          {loading
            ? "Creating…"
            : `Create batch${
                selectedPatientIds.length > 0
                  ? ` for ${selectedPatientIds.length}`
                  : ""
              }`}
        </Button>
      </div>
    </div>
  )
}
