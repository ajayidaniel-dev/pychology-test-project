"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Minus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/layout/empty-state"
import { cn } from "@/lib/utils"
import type { PatientSummary } from "@/app/api/patients/[id]/summary/route"

interface Props {
  patientId: string
  completedCount: number
  initialSummary: PatientSummary | null
  initialGeneratedAt: string | null
  /** Completed-session count the stored summary was built from. */
  initialSessionCount: number | null
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
    className:
      "border-severity-high/40 bg-severity-high/10 text-severity-high",
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

export function PatientSummaryCard({
  patientId,
  completedCount,
  initialSummary,
  initialGeneratedAt,
  initialSessionCount,
}: Props) {
  const [summary, setSummary] = useState<PatientSummary | null>(initialSummary)
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt)
  const [builtFromCount, setBuiltFromCount] = useState<number | null>(
    initialSessionCount,
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The stored summary predates a newer assessment; offer a rebuild without
  // discarding the still-useful older one.
  const stale =
    summary !== null &&
    builtFromCount !== null &&
    builtFromCount !== completedCount

  const generate = useCallback(
    async (regenerate: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/patients/${patientId}/summary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regenerate }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.summary) {
          throw new Error(
            data?.error ?? `Failed to generate summary (HTTP ${res.status})`,
          )
        }
        setSummary(data.summary)
        setGeneratedAt(data.generatedAt ?? null)
        setBuiltFromCount(data.sessionCount ?? completedCount)
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to generate summary."
        setError(message)
        toast.error(message)
      } finally {
        setLoading(false)
      }
    },
    [patientId, completedCount],
  )

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
            AI overview of this patient across {completedCount} completed{" "}
            {completedCount === 1 ? "assessment" : "assessments"}. For clinician
            review — not a substitute for professional judgment.
          </CardDescription>
        </div>
        {direction && !loading && (
          <Badge variant="outline" className={cn("gap-1", direction.className)}>
            <direction.icon className="size-3" aria-hidden />
            {direction.label}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {loading && (
          <div className="space-y-4" aria-busy="true" aria-label="Generating summary">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="hidden size-7 shrink-0 rounded-md sm:block" />
                <div className="w-full space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <Alert variant="destructive">
            <AlertTitle>Summary unavailable</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/30 bg-background"
                onClick={() => generate(Boolean(summary))}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!summary && !loading && !error && (
          <EmptyState
            plain
            icon={<Sparkles className="size-5" />}
            title="No summary generated yet"
            description="Build an AI overview that tracks this patient's severity, context, and trajectory across every completed assessment."
            action={
              <Button onClick={() => generate(false)}>
                <Sparkles className="size-4" aria-hidden />
                Generate summary
              </Button>
            }
          />
        )}

        {summary && !loading && (
          <div aria-live="polite" className="space-y-5">
            {stale && (
              <Alert>
                <Users className="size-4" />
                <AlertTitle>New assessments since this summary</AlertTitle>
                <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Built from {builtFromCount} of {completedCount} completed
                    assessments. Regenerate to include the latest.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => generate(true)}
                  >
                    <RefreshCw className="size-3.5" aria-hidden />
                    Update
                  </Button>
                </AlertDescription>
              </Alert>
            )}

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
        )}

        {summary && !loading && (
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground sm:w-auto"
              onClick={() => generate(true)}
              disabled={loading}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Regenerate
            </Button>
            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Generated {new Date(generatedAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
