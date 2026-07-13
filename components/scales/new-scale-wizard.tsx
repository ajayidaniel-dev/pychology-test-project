"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { BasicInfoStep } from "@/components/scales/wizard-steps/basic-info-step"
import {
  QuestionsStep,
  type DraftItem,
  type ItemType,
  type Option,
} from "@/components/scales/wizard-steps/questions-step"
import {
  ThresholdsStep,
  type DraftThreshold,
} from "@/components/scales/wizard-steps/thresholds-step"
import { cn } from "@/lib/utils"

const STEPS = ["Basic Info", "Questions", "Score Thresholds"]

export function NewScaleWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [itemsError, setItemsError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const [items, setItems] = useState<DraftItem[]>([])
  const [itemText, setItemText] = useState("")
  const [itemType, setItemType] = useState<ItemType>("MULTIPLE_CHOICE")
  const [options, setOptions] = useState<Option[]>([{ label: "", value: "" }])

  const [thresholds, setThresholds] = useState<DraftThreshold[]>([
    { label: "", minScore: "", maxScore: "" },
  ])

  function addOption() {
    setOptions((o) => [...o, { label: "", value: "" }])
  }

  function removeOption(i: number) {
    setOptions((o) => o.filter((_, idx) => idx !== i))
  }

  function updateOption(i: number, field: "label" | "value", val: string) {
    setOptions((o) =>
      o.map((opt, idx) => (idx === i ? { ...opt, [field]: val } : opt)),
    )
  }

  function addItem() {
    if (!itemText.trim()) return
    const newItem: DraftItem = {
      text: itemText.trim(),
      type: itemType,
      options:
        itemType === "MULTIPLE_CHOICE"
          ? options.filter((o) => o.label.trim())
          : [],
    }
    setItems((prev) => [...prev, newItem])
    setItemText("")
    setItemType("MULTIPLE_CHOICE")
    setOptions([{ label: "", value: "" }])
    setItemsError(null)
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addThresholdRow() {
    setThresholds((t) => [...t, { label: "", minScore: "", maxScore: "" }])
  }

  function removeThresholdRow(i: number) {
    setThresholds((t) => t.filter((_, idx) => idx !== i))
  }

  function updateThreshold(
    i: number,
    field: keyof DraftThreshold,
    val: string,
  ) {
    setThresholds((t) =>
      t.map((th, idx) => (idx === i ? { ...th, [field]: val } : th)),
    )
  }

  function goNext() {
    if (step === 0) {
      if (!name.trim()) {
        setNameError("Scale name is required")
        return
      }
      setNameError(null)
    }
    if (step === 1) {
      if (items.length === 0) {
        setItemsError("Add at least one question before continuing")
        return
      }
      setItemsError(null)
    }
    setStep((s) => s + 1)
  }

  async function finish() {
    setSaving(true)
    setError(null)
    let scale: { id: string } | null = null
    try {
      const scaleRes = await fetch("/api/scales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })
      if (!scaleRes.ok) throw new Error("Failed to create scale")
      scale = await scaleRes.json()

      await Promise.all(
        items.map(async (item, i) => {
          const body: Record<string, unknown> = {
            text: item.text,
            type: item.type,
            order: i + 1,
          }
          if (item.type === "MULTIPLE_CHOICE" && item.options.length) {
            body.options = item.options.map((o, oi) => ({
              label: o.label,
              value: o.value !== "" ? Number(o.value) : undefined,
              order: oi,
            }))
          }
          const r = await fetch(`/api/scales/${scale!.id}/items`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
          if (!r.ok) throw new Error("Failed to save item")
        }),
      )

      for (const th of thresholds) {
        if (!th.label.trim() || th.minScore === "" || th.maxScore === "") continue
        const r = await fetch(`/api/scales/${scale!.id}/thresholds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: th.label,
            minScore: Number(th.minScore),
            maxScore: Number(th.maxScore),
          }),
        })
        if (!r.ok) throw new Error("Failed to save threshold")
      }

      toast.success("Scale created")
      router.push("/scales")
    } catch (e: unknown) {
      if (scale) {
        await fetch(`/api/scales/${scale.id}`, { method: "DELETE" }).catch(
          () => {},
        )
      }
      setError(e instanceof Error ? e.message : "Something went wrong")
      setSaving(false)
    }
  }

  return (
    <div className="pb-24 md:pb-0">
      {/* Stepper */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                i < step && "bg-primary text-primary-foreground",
                i === step && "border-2 border-primary bg-primary/10 text-primary",
                i > step && "bg-muted text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "hidden text-xs font-medium md:inline",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 bg-border md:w-8" />
            )}
          </div>
        ))}
      </div>

      {step === 0 && (
        <BasicInfoStep
          name={name}
          description={description}
          onNameChange={setName}
          onDescriptionChange={setDescription}
          nameError={nameError ?? undefined}
        />
      )}

      {step === 1 && (
        <QuestionsStep
          items={items}
          itemText={itemText}
          itemType={itemType}
          options={options}
          itemsError={itemsError ?? undefined}
          onItemTextChange={setItemText}
          onItemTypeChange={setItemType}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onAddOption={addOption}
          onRemoveOption={removeOption}
          onUpdateOption={updateOption}
        />
      )}

      {step === 2 && (
        <ThresholdsStep
          thresholds={thresholds}
          onAddRow={addThresholdRow}
          onRemoveRow={removeThresholdRow}
          onUpdate={updateThreshold}
        />
      )}

      {error && (
        <div className="mt-4">
          <FormErrorAlert message={error} />
        </div>
      )}

      {/* Sticky footer on mobile */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:static md:mt-6 md:border-0 md:bg-transparent md:p-0">
        <div className="flex justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              step === 0 ? router.push("/scales") : setStep((s) => s - 1)
            }
            className="gap-1"
          >
            <ChevronLeft className="size-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} className="gap-1">
              Next
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={finish}
              disabled={saving}
              className="gap-1"
            >
              {saving ? (
                "Saving…"
              ) : (
                <>
                  <Check className="size-4" />
                  Create scale
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
