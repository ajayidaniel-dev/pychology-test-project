"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DataTableToolbarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DataTableToolbar({
  value,
  onChange,
  placeholder = "Search…",
}: DataTableToolbarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 pl-9"
        aria-label={placeholder}
      />
    </div>
  )
}
