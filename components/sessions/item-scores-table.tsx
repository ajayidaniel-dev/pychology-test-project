"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { cn } from "@/lib/utils"
import type { ItemScoreRow } from "@/components/sessions/item-scores-section"

const columns: ColumnDef<ItemScoreRow>[] = [
  {
    accessorKey: "label",
    meta: { className: "whitespace-normal break-words py-3" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Question" />
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.label}</span>
    ),
  },
  {
    accessorKey: "score",
    meta: { className: "w-24 align-top py-3" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Score" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium tabular-nums">
        {row.original.score}
      </span>
    ),
  },
]

interface ItemScoresTableProps {
  items: ItemScoreRow[]
}

export function ItemScoresTable({ items }: ItemScoresTableProps) {
  return (
    <TanStackDataTable
      columns={columns}
      data={items}
      shell={false}
      isRowClickable={() => false}
      getRowClassName={(row) =>
        row.isSafetyItem ? "bg-destructive/5 hover:bg-destructive/10" : undefined
      }
      enablePagination={items.length > 10}
      mobileListClassName="divide-y"
      renderMobileRow={(item) => (
        <div
          className={cn(
            "min-h-14 px-4 py-3",
            item.isSafetyItem && "bg-destructive/5",
          )}
        >
          <p className="line-clamp-2 text-sm font-medium">{item.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Score:{" "}
            <span className="font-semibold text-foreground">{item.score}</span>
          </p>
        </div>
      )}
    />
  )
}
