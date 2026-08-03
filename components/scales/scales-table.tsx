"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { BookOpen, ChevronRight, User } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { cn } from "@/lib/utils"

export interface ScaleTableRow {
  id: string
  name: string
  description: string | null
  isLibrary: boolean
  _count?: { items: number }
}

const columns: ColumnDef<ScaleTableRow>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    // No "Library" badge. The table only ever renders inside a section already
    // headed "Library Scales" or "My Scales", so the badge repeated a fact the
    // heading had just stated — on every row of one table and no row of the
    // other, which is the definition of a chip that carries no information.
    cell: ({ row }) => (
      <span className="font-medium">{row.original.name}</span>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    /*
     * truncate, not line-clamp-1: TableCell sets whitespace-nowrap, so the
     * text never forms a second line box and line-clamp produced no ellipsis
     * — the cell just hard-clipped mid-word. title= keeps the full text
     * reachable on hover now that it's visibly shortened.
     */
    cell: ({ row }) => (
      <span
        className="block truncate text-muted-foreground"
        title={row.original.description ?? undefined}
      >
        {row.original.description ?? "—"}
      </span>
    ),
  },
  {
    id: "items",
    accessorFn: (row) => row._count?.items ?? 0,
    meta: { className: "text-right" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" align="right" />
    ),
    // Mono tabular-nums, right-aligned: same figure vocabulary as every other
    // count in the app, so digits stack into one scannable edge.
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.original._count?.items ?? "—"}
        </span>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    ),
  },
]

interface ScalesTableProps {
  scales: ScaleTableRow[]
  searchPlaceholder?: string
}

export function ScalesTable({
  scales,
  searchPlaceholder = "Search scales…",
}: ScalesTableProps) {
  const practiceHref = usePracticeHref()

  const hasDescriptions = scales.some((s) => s.description)
  const visibleColumns = columns.filter((column) => {
    if ("accessorKey" in column && column.accessorKey === "description") return hasDescriptions
    return true
  })

  return (
    <TanStackDataTable
      columns={visibleColumns}
      data={scales}
      getRowHref={(row) => practiceHref(`/scales/${row.id}`)}
      enableSearch
      searchPlaceholder={searchPlaceholder}
      globalFilterFn={(row, filter) => {
        const query = filter.toLowerCase()
        return (
          row.name.toLowerCase().includes(query) ||
          (row.description?.toLowerCase().includes(query) ?? false)
        )
      }}
      mobileListClassName="divide-y"
      renderMobileRow={(scale) => (
        <Link
          href={practiceHref(`/scales/${scale.id}`)}
          className="block min-h-22 px-4 py-3 transition-colors hover:bg-accent/50 active:bg-accent"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                  scale.isLibrary ? "bg-primary/10" : "bg-muted",
                )}
              >
                {scale.isLibrary ? (
                  <BookOpen className="size-4 text-primary" />
                ) : (
                  <User className="size-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{scale.name}</p>
                {scale.description && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {scale.description}
                  </p>
                )}
                {scale._count !== undefined && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {scale._count.items} item
                    {scale._count.items !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </div>
        </Link>
      )}
    />
  )
}
