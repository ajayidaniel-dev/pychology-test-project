"use client"

import { type Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>
  title: string
  /**
   * Numeric columns are right-aligned so digits stack into a single scannable
   * edge; their header has to follow the figures or the column reads crooked.
   */
  align?: "left" | "right"
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  align = "left",
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const right = align === "right"

  if (!column.getCanSort()) {
    return (
      <span
        className={cn(
          "block text-xs font-medium tracking-wide uppercase",
          right && "text-right",
          className,
        )}
      >
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
        "h-8 gap-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase hover:text-foreground",
        right ? "-mr-3 ml-auto flex-row-reverse" : "-ml-3",
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
          className="size-3.5 opacity-0 transition-opacity duration-150 ease-out-quart group-hover/th:opacity-50 group-focus-within/th:opacity-50"
        />
      )}
    </Button>
  )
}
