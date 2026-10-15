"use client"

import { type ColumnDef } from "@tanstack/react-table"
import { TanStackDataTable } from "@/components/data-table/data-table"
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header"
import { Checkbox } from "@/components/ui/checkbox"
import { SeverityBadge } from "@/components/ui/severity-badge"
import type { PatientListItem } from "@/lib/patient-summary"

function lastAssessedLabel(date: Date | null): string {
  if (!date) return "Never"
  const days = Math.floor(
    (Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000),
  )
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

const columns: ColumnDef<PatientListItem>[] = [
  {
    accessorKey: "anonymousId",
    header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
    cell: ({ row }) => (
      <span className="font-medium">{row.original.anonymousId}</span>
    ),
  },
  {
    accessorKey: "displayName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.displayName ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "severity",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Severity" />
    ),
    cell: ({ row }) =>
      row.original.severity && row.original.severity !== "none" ? (
        <SeverityBadge severity={row.original.severity} />
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "lastAssessed",
    accessorFn: (row) =>
      row.lastAssessedAt ? new Date(row.lastAssessedAt).getTime() : 0,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Last assessed" />
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {lastAssessedLabel(row.original.lastAssessedAt)}
      </span>
    ),
  },
]

interface BatchPatientPickerProps {
  patients: PatientListItem[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function BatchPatientPicker({
  patients,
  selectedIds,
  onSelectionChange,
}: BatchPatientPickerProps) {
  return (
    <TanStackDataTable
      columns={columns}
      data={patients}
      shell={false}
      enableRowSelection
      getRowId={(row) => row.id}
      selectedIds={selectedIds}
      onSelectionChange={onSelectionChange}
      // Deliberately no getRowHref: in the picker a row click selects, it does
      // not navigate away mid-compose.
      enableSearch
      searchPlaceholder="Search by ID or name…"
      globalFilterFn={(row, filter) => {
        const query = filter.toLowerCase()
        return (
          row.anonymousId.toLowerCase().includes(query) ||
          (row.displayName?.toLowerCase().includes(query) ?? false)
        )
      }}
      pageSize={25}
      mobileListClassName="divide-y"
      renderMobileRow={(row) => {
        const selected = selectedIds.includes(row.id)
        return (
          <label className="flex min-h-18 cursor-pointer items-start gap-3 px-4 py-3 transition-colors active:bg-accent">
            <Checkbox
              checked={selected}
              onCheckedChange={(value) =>
                onSelectionChange(
                  value === true
                    ? [...selectedIds, row.id]
                    : selectedIds.filter((id) => id !== row.id),
                )
              }
              className="mt-0.5"
              aria-label={`Select ${row.anonymousId}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold">{row.anonymousId}</span>
                  {row.displayName && (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {row.displayName}
                    </p>
                  )}
                </div>
                {row.severity && row.severity !== "none" && (
                  <SeverityBadge severity={row.severity} />
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last assessed {lastAssessedLabel(row.lastAssessedAt).toLowerCase()}
              </p>
            </div>
          </label>
        )
      }}
    />
  )
}
