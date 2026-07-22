"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface TanStackDataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  getRowHref?: (row: T) => string | null
  isRowClickable?: (row: T) => boolean
  renderMobileRow?: (row: T) => React.ReactNode
  /** Overrides the mobile list wrapper (default "space-y-3 p-4"), e.g. "divide-y" for flat rows inside a Card. */
  mobileListClassName?: string
  getRowClassName?: (row: T) => string | undefined
  enablePagination?: boolean
  enableSorting?: boolean
  enableSearch?: boolean
  searchPlaceholder?: string
  globalFilterFn?: (row: T, filter: string) => boolean
  pageSize?: number
  emptyState?: React.ReactNode
  className?: string
  shell?: boolean
}

export function TanStackDataTable<T>({
  columns,
  data,
  onRowClick,
  getRowHref,
  isRowClickable,
  renderMobileRow,
  mobileListClassName,
  getRowClassName,
  enablePagination = true,
  enableSorting = true,
  enableSearch = false,
  searchPlaceholder,
  globalFilterFn,
  pageSize = 10,
  emptyState,
  className,
  shell = true,
}: TanStackDataTableProps<T>) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState("")

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!filterValue) return true
      if (globalFilterFn) {
        return globalFilterFn(row.original, String(filterValue))
      }
      return true
    },
    initialState: {
      pagination: { pageSize },
    },
  })

  const rows = table.getRowModel().rows
  const showPagination = enablePagination && table.getPageCount() > 1

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  function handleRowActivate(row: T) {
    const clickable = isRowClickable ? isRowClickable(row) : true
    if (!clickable) return

    onRowClick?.(row)
    const href = getRowHref?.(row)
    if (href) router.push(href)
  }

  const content = (
    <div className={cn("flex flex-col", className)}>
      {enableSearch && (
        <div className="border-b px-4 py-3 md:px-6">
          <DataTableToolbar
            value={globalFilter}
            onChange={setGlobalFilter}
            placeholder={searchPlaceholder}
          />
        </div>
      )}

      {isMobile && renderMobileRow ? (
        <div className={mobileListClassName ?? "space-y-3 p-4"}>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No results.
            </p>
          ) : (
            rows.map((row) => (
              <div key={row.id}>{renderMobileRow(row.original)}</div>
            ))
          )}
        </div>
      ) : (
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="border-b-0 bg-muted/50 hover:bg-muted/50"
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      // group/th drives the sort-affordance reveal in
                      // DataTableColumnHeader.
                      "group/th h-11 px-4 text-muted-foreground first:pl-6 last:pr-6",
                      header.column.id === "actions" && "w-12 px-2",
                      (header.column.columnDef.meta as { className?: string } | undefined)
                        ?.className,
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const original = row.original
                const href = getRowHref?.(original) ?? null
                const clickable = isRowClickable
                  ? isRowClickable(original)
                  : Boolean(href || onRowClick)

                // When the row resolves to a URL we render a real anchor in the
                // first cell and stretch it over the row. Row-level onClick
                // alone gave no link semantics — no cmd/middle-click, no "open
                // in new tab", and screen readers announced a row, not a link.
                // Rows that only have onRowClick keep the keyboard-activated
                // fallback. A row that isn't clickable never gets the link,
                // even if getRowHref still resolves one for it.
                const usesStretchedLink = Boolean(href) && clickable

                return (
                  <TableRow
                    key={row.id}
                    tabIndex={clickable && !usesStretchedLink ? 0 : undefined}
                    onClick={
                      usesStretchedLink
                        ? undefined
                        : () => clickable && handleRowActivate(original)
                    }
                    onKeyDown={(event) => {
                      if (
                        clickable &&
                        !usesStretchedLink &&
                        (event.key === "Enter" || event.key === " ")
                      ) {
                        event.preventDefault()
                        handleRowActivate(original)
                      }
                    }}
                    className={cn(
                      "relative transition-colors",
                      clickable && "cursor-pointer hover:bg-muted/50",
                      "focus-within:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      getRowClassName?.(original),
                    )}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          "px-4 first:pl-6 last:pr-6",
                          cell.column.id === "actions" && "relative z-20 w-12 px-2",
                          (cell.column.columnDef.meta as { className?: string } | undefined)
                            ?.className,
                        )}
                        onClick={(event) => {
                          if (cell.column.id === "actions") {
                            event.stopPropagation()
                          }
                        }}
                      >
                        {usesStretchedLink && cellIndex === 0 ? (
                          // before: pseudo covers the row without becoming a
                          // real element over it, so cell text stays selectable
                          // and the actions cell (z-20) still wins clicks.
                          <Link
                            href={href!}
                            className="rounded-sm outline-none before:absolute before:inset-0 before:z-10"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </Link>
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      )}

      {showPagination && <DataTablePagination table={table} />}
    </div>
  )

  if (!shell) return content

  return (
    <Card className="overflow-hidden py-0 shadow-sm">{content}</Card>
  )
}

export { DataTableColumnHeader }
