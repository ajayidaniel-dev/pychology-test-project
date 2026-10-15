"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PatientRecordTabsProps {
  overview: React.ReactNode
  assessments: React.ReactNode
  details: React.ReactNode
  notes: React.ReactNode
  /** Number of completed assessments, shown on the tab. */
  assessmentCount: number
  /** Clinical content — omitted entirely for roles that cannot see it. */
  showScores?: boolean
  showNotes?: boolean
}

/**
 * The patient record as a navigated surface rather than one long scroll.
 *
 * Previously eight sections stacked vertically — profile, ideation alert, AI
 * summary, score chart, details, sessions, direct sends, notes — so finding
 * last month's GAD-7 meant scrolling past an AI summary to reach it. Tabs put
 * each register one click away instead of one scroll-hunt away.
 *
 * Anything genuinely urgent stays OUTSIDE this component, rendered above it by
 * the page. A suicidal-ideation warning behind a tab is a warning nobody sees.
 *
 * Slots are server-rendered and passed through as children, so tabbing costs no
 * extra fetch and the record still renders fully on the server.
 *
 * Notes and score-heavy overview content are filtered by role — never
 * rendered-then-disabled.
 */
export function PatientRecordTabs({
  overview,
  assessments,
  details,
  notes,
  assessmentCount,
  showScores = true,
  showNotes = true,
}: PatientRecordTabsProps) {
  const defaultTab = showScores ? "overview" : "assessments"

  return (
    <Tabs defaultValue={defaultTab} className="gap-6">
      <TabsList>
        {showScores && <TabsTrigger value="overview">Overview</TabsTrigger>}
        <TabsTrigger value="assessments">
          Assessments
          {assessmentCount > 0 && (
            <span className="ml-1.5 font-mono text-xs tabular-nums text-muted-foreground">
              {assessmentCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        {showNotes && <TabsTrigger value="notes">Notes</TabsTrigger>}
      </TabsList>

      {showScores && (
        <TabsContent value="overview" className="flex flex-col gap-6">
          {overview}
        </TabsContent>
      )}
      <TabsContent value="assessments" className="flex flex-col gap-6">
        {assessments}
      </TabsContent>
      <TabsContent value="details" className="flex flex-col gap-6">
        {details}
      </TabsContent>
      {showNotes && (
        <TabsContent value="notes" className="flex flex-col gap-6">
          {notes}
        </TabsContent>
      )}
    </Tabs>
  )
}
