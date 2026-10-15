import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Minus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { EmptyState } from "@/components/layout/empty-state"
import { cn } from "@/lib/utils"
import type { PatientSummary } from "@/lib/patient-summary-ai"

interface Props {
  completedCount: number
  summary: PatientSummary | null
  generatedAt: Date | null
}

const DIRECTION_STYLES: Record<
  PatientSummary["direction"],
  { label: string; icon: React.ElementType; className: string }
> = {
  improving: {
    label: "Improving",
    icon: ArrowDownRight,
    className: "border-severity-low/40 bg-severity-low/10 text-severity-low",
  },
  stable: {
    label: "Stable",
    icon: Minus,
    className: "border-border bg-muted text-muted-foreground",
  },
  worsening: {
    label: "Worsening",
    icon: ArrowUpRight,
    className: "border-severity-high/40 bg-severity-high/10 text-severity-high",
  },
  "insufficient-data": {
    label: "Not enough data",
    icon: ArrowRight,
    className: "border-border bg-muted text-muted-foreground",
  },
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 hidden size-7 shrink-0 items-center justify-center rounded-md bg-muted sm:flex">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="min-w-0 space-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
        <p className="text-sm leading-relaxed text-foreground">{children}</p>
      </div>
    </div>
  )
}

/**
 * Read-only display of the patient's cross-session AI summary. The summary is
 * generated automatically when a questionnaire is completed (see
 * lib/patient-summary-ai.ts) — there is no manual trigger here.
 */
export function PatientSummaryCard({
  completedCount,
  summary,
  generatedAt,
}: Props) {
  const direction = summary ? DIRECTION_STYLES[summary.direction] : null

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4 text-muted-foreground" aria-hidden />
            Patient summary
          </CardTitle>
          <CardDescription>
            AI overview across {completedCount} completed{" "}
            {completedCount === 1 ? "assessment" : "assessments"}, refreshed each
            time a new one is submitted. For clinician review — not a substitute
            for professional judgment.
          </CardDescription>
        </div>
        {direction && (
          <Badge variant="outline" className={cn("gap-1", direction.className)}>
            <direction.icon className="size-3" aria-hidden />
            {direction.label}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {!summary ? (
          <EmptyState
            plain
            icon={<Sparkles className="size-5" />}
            title="Summary is being prepared"
            description="A cross-session overview is generated automatically after a questionnaire is submitted. Check back shortly, or it will appear once the next assessment is completed."
          />
        ) : (
          <>
            <div className="space-y-5">
              <Section icon={TrendingUp} title="The arc">
                {summary.arc}
              </Section>

              <Section icon={Sparkles} title="Where they are now">
                {summary.currentPicture}
              </Section>

              {summary.contextFactors && (
                <Section icon={Users} title="Context">
                  {summary.contextFactors}
                </Section>
              )}

              {summary.safetyConcern ? (
                <Alert variant="destructive" role="alert">
                  <AlertTriangle />
                  <AlertTitle>Safety</AlertTitle>
                  <AlertDescription>{summary.safety}</AlertDescription>
                </Alert>
              ) : (
                <Section icon={ShieldCheck} title="Safety">
                  {summary.safety}
                </Section>
              )}

              <Section icon={ArrowRight} title="Watch for">
                {summary.watchFor}
              </Section>
            </div>

            {generatedAt && (
              <p className="border-t pt-4 text-xs text-muted-foreground">
                Generated {generatedAt.toLocaleString()}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
