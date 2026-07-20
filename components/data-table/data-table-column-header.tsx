"use client"

import { type Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <span className={cn("text-xs font-medium uppercase tracking-wide", className)}>
        {title}
      </span>
    )
  }

  const sorted = column.getIsSorted()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "-ml-3 h-8 gap-1 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {/*
        The active direction always shows. The neutral affordance only appears
        on hover/focus — one per column across a whole table read as noise and
        competed with the data. Space is reserved either way, so revealing it
        never shifts the header.
      */}
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5" />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5" />
      ) : (
        <ArrowUpDown
          aria-hidden
          className="size-3.5 opacity-0 transition-opacity group-hover/th:opacity-50 group-focus-within/th:opacity-50"
        />
      )}
    </Button>
  )
}
