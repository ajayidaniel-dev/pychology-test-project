"use client"

import { usePracticeHref } from "@/components/layout/practice-provider"

import Link from "next/link"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/empty-state"
import { PatientListTable } from "@/components/patients/patient-list-table"
import type { PatientListItem } from "@/lib/patient-summary"

interface PatientListSectionProps {
  patients: PatientListItem[]
  emptyAction?: React.ReactNode
}

export function PatientListSection({
  patients,
  emptyAction,
}: PatientListSectionProps) {
  const practiceHref = usePracticeHref()

  if (patients.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="No patients yet"
        description="Add your first patient to start sending assessment links and tracking scores."
        action={
          emptyAction ?? (
            <Button asChild>
              <Link href={practiceHref("/patients")}>Add first patient</Link>
            </Button>
          )
        }
      />
    )
  }

  return <PatientListTable patients={patients} />
}
