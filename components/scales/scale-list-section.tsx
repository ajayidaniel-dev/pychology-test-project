"use client"

import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { ScalesTable } from "@/components/scales/scales-table"

interface ScaleListItem {
  id: string
  name: string
  description: string | null
  isLibrary: boolean
  _count?: { items: number }
}

interface ScaleListSectionProps {
  libraryScales: ScaleListItem[]
  myScales: ScaleListItem[]
}

export function ScaleListSection({
  libraryScales,
  myScales,
}: ScaleListSectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <SectionHeader title="Library Scales" />
          <Badge variant="secondary" className="font-normal">
            {libraryScales.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Read-only validated instruments
        </p>
        <ScalesTable
          scales={libraryScales}
          searchPlaceholder="Search library scales…"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <SectionHeader title="My Scales" />
          <Badge variant="secondary" className="font-normal">
            {myScales.length}
          </Badge>
        </div>

        {myScales.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-5" />}
            title="No custom scales yet"
            description="Create a custom questionnaire tailored to your practice."
            action={
              <Button asChild>
                <Link href="/scales/new">Create your first scale</Link>
              </Button>
            }
          />
        ) : (
          <ScalesTable
            scales={myScales}
            searchPlaceholder="Search my scales…"
          />
        )}
      </section>
    </div>
  )
}
