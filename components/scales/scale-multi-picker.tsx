"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export interface PickableScale {
  id: string
  name: string
  description: string | null
  isLibrary: boolean
}

interface ScaleMultiPickerProps {
  scales: PickableScale[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

function Group({
  label,
  scales,
  selectedIds,
  onToggle,
}: {
  label: string
  scales: PickableScale[]
  selectedIds: string[]
  onToggle: (id: string, checked: boolean) => void
}) {
  if (scales.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2">
        {scales.map((scale) => (
          <div key={scale.id} className="flex items-start gap-2">
            <Checkbox
              id={`scale-${scale.id}`}
              checked={selectedIds.includes(scale.id)}
              onCheckedChange={(value) => onToggle(scale.id, value === true)}
              className="mt-0.5"
            />
            <div className="grid gap-0.5">
              <Label
                htmlFor={`scale-${scale.id}`}
                className="cursor-pointer font-normal"
              >
                {scale.name}
              </Label>
              {scale.description && (
                <p className="text-xs text-muted-foreground">
                  {scale.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Picks the questionnaire set for a send. Selection order is preserved: it
 * becomes the order the patient answers them in, and the order they are named
 * in a direct send's title.
 */
export function ScaleMultiPicker({
  scales,
  selectedIds,
  onChange,
}: ScaleMultiPickerProps) {
  function onToggle(id: string, checked: boolean) {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((s) => s !== id))
  }

  return (
    <div className="space-y-4">
      <Group
        label="Library"
        scales={scales.filter((s) => s.isLibrary)}
        selectedIds={selectedIds}
        onToggle={onToggle}
      />
      <Group
        label="Custom"
        scales={scales.filter((s) => !s.isLibrary)}
        selectedIds={selectedIds}
        onToggle={onToggle}
      />
    </div>
  )
}
