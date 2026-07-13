"use client"

import Link from "next/link"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { CaseloadTable } from "@/components/dashboard/caseload-table"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import type { SeverityLevel } from "@/components/ui/severity-badge"

export interface CaseloadPatient {
  id: string
  anonymousId: string
  latestScaleName: string | null
  latestScore: number | null
  sessionCount: number
  severity: SeverityLevel | null
}

export function CaseloadSection({ patients }: { patients: CaseloadPatient[] }) {
  return (
    <section className="space-y-3">
      <Card className="overflow-hidden py-0 shadow-sm">
        <CardHeader className="border-b px-4 py-4 md:px-6">
          <SectionHeader
            title="Caseload"
            action={{ label: "Manage patients", href: "/patients" }}
          />
        </CardHeader>

        {patients.length === 0 ? (
          <CardContent className="p-4 md:p-6">
            <EmptyState
              icon={<Users className="size-5" />}
              title="No patients yet"
              description="Add your first patient to start sending assessment links and tracking scores."
              action={
                <Button asChild>
                  <Link href="/patients">Add your first patient</Link>
                </Button>
              }
            />
          </CardContent>
        ) : (
          <div className="px-4 pb-4 md:px-6 md:pb-6">
            <CaseloadTable patients={patients} />
          </div>
        )}
      </Card>
    </section>
  )
}
