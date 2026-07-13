"use client"

import Link from "next/link"
import { type ColumnDef } from "@tanstack/react-table"
import { BookOpen, ChevronRight, User } from "lucide-react"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Badge } from "@/components/ui/badge"
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
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.isLibrary && (
          <Badge variant="secondary" className="text-xs font-normal">
            Library
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ row }) => (
      <span className="line-clamp-1 max-w-md text-muted-foreground">
        {row.original.description ?? "—"}
      </span>
    ),
  },
  {
    id: "items",
    accessorFn: (row) => row._count?.items ?? 0,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Items" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original._count?.items ?? "—"}
      </span>
    ),
  },
  {
    id: "type",
    accessorKey: "isLibrary",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Type" />
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            row.original.isLibrary ? "bg-primary/10" : "bg-muted",
          )}
        >
          {row.original.isLibrary ? (
            <BookOpen className="size-4 text-primary" />
          ) : (
            <User className="size-4 text-muted-foreground" />
          )}
        </div>
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
  return (
    <TanStackDataTable
      columns={columns}
      data={scales}
      getRowHref={(row) => `/scales/${row.id}`}
      enableSearch
      searchPlaceholder={searchPlaceholder}
      globalFilterFn={(row, filter) => {
        const query = filter.toLowerCase()
        return (
          row.name.toLowerCase().includes(query) ||
          (row.description?.toLowerCase().includes(query) ?? false)
        )
      }}
      renderMobileRow={(scale) => (
        <Link
          href={`/scales/${scale.id}`}
          className="block min-h-[88px] rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50 active:bg-accent"
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{scale.name}</p>
                  {scale.isLibrary && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      Library
                    </Badge>
                  )}
                </div>
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
