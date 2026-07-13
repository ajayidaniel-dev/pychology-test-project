"use client"

import { cn } from "@/lib/utils"

interface OptionCardProps {
  label: string
  selected: boolean
  onSelect: () => void
  id: string
}

export function OptionCard({ label, selected, onSelect, id }: OptionCardProps) {
  return (
    <button
      type="button"
      id={id}
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 w-full items-center rounded-lg border p-4 text-left text-sm transition-colors",
        "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-border bg-card",
      )}
    >
      {label}
    </button>
  )
}
