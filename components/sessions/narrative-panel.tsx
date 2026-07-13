"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle } from "lucide-react"
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

const SCALE_NAMES: Record<string, string> = {
  PHQ9: "PHQ-9",
  BDI2: "BDI-II",
  GAD7: "GAD-7",
}

interface Props {
  clinicalPayload: {
    scale: string
    scaleName?: string
    totalScore: number
    severity: string
    itemScores: Record<string, number>
    itemLabels?: Record<string, string>
    suicidalIdeation: boolean
  }
  sessionId: string
  patientId: string
  initialReviewed?: boolean
  initialEscalated?: boolean
}

function buildPrompt(payload: Props["clinicalPayload"]): string {
  const items = Object.entries(payload.itemScores)
    .map(([k, v]) => {
      const label = payload.itemLabels?.[k] ?? `Item ${k}`
      return `${label}: ${v}`
    })
    .join(", ")

  return `You are a clinical psychologist assistant providing a structured clinical summary for a clinician's review. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language. You have no identifying information about this person.

Scale: ${SCALE_NAMES[payload.scale] ?? payload.scaleName ?? payload.scale}
Total score: ${payload.totalScore} — Severity: ${payload.severity}
Item scores: ${items}
${payload.suicidalIdeation ? "NOTE: Suicidal ideation item is endorsed above zero. This must be flagged as the first clinical priority." : ""}

Write a clinical summary of 4–5 sentences: (1) overall severity with reference to the score, (2) most clinically significant item-level patterns, (3) any safety-relevant endorsements, (4) recommended follow-up priority (routine / priority / urgent) with brief rationale.`
}

export function NarrativePanel({
  clinicalPayload,
  sessionId,
  patientId,
  initialReviewed = false,
  initialEscalated = false,
}: Props) {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(initialReviewed)
  const [escalated, setEscalated] = useState(initialEscalated)
  const [actionLoading, setActionLoading] = useState<"reviewed" | "escalated" | null>(null)
  const [fetchKey, setFetchKey] = useState(0)

  const fetchNarrative = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNarrative(null)

    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: buildPrompt(clinicalPayload) }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate summary")
      }
      setNarrative(data.content?.[0]?.text ?? "Unable to generate summary.")
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to generate summary. Check your API key.",
      )
    } finally {
      setLoading(false)
    }
  }, [clinicalPayload, fetchKey])

  useEffect(() => {
    fetchNarrative()
  }, [fetchNarrative])

  async function recordAction(action: "reviewed" | "escalated") {
    setActionLoading(action)
    const res = await fetch(`/api/patients/${patientId}/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    setActionLoading(null)

    if (!res.ok) {
      toast.error(`Failed to mark as ${action}`)
      return
    }

    if (action === "reviewed") {
      setReviewed(true)
      toast.success("Marked as reviewed")
    } else {
      setEscalated(true)
      toast.success("Escalated to supervisor")
    }
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">AI Clinical Summary</CardTitle>
          <CardDescription>
            AI-generated summary for clinician review only. Not a substitute for
            professional clinical judgment.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {reviewed && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="size-3" />
              Reviewed
            </Badge>
          )}
          {escalated && (
            <Badge
              variant="outline"
              className="gap-1 border-severity-moderate/40 text-severity-moderate"
            >
              <AlertTriangle className="size-3" />
              Escalated
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Summary unavailable</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-destructive/30 bg-background"
                onClick={() => setFetchKey((k) => k + 1)}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {narrative && !loading && (
          <div
            aria-live="polite"
            className="prose prose-sm dark:prose-invert max-w-prose leading-relaxed text-foreground"
          >
            <p>{narrative}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => !reviewed && recordAction("reviewed")}
            disabled={reviewed || actionLoading === "reviewed"}
          >
            {reviewed
              ? "Reviewed"
              : actionLoading === "reviewed"
                ? "Saving…"
                : "Mark Reviewed"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-severity-moderate/40 text-severity-moderate hover:bg-severity-moderate/10 sm:w-auto"
            onClick={() => !escalated && recordAction("escalated")}
            disabled={escalated || actionLoading === "escalated"}
          >
            {escalated
              ? "Escalated"
              : actionLoading === "escalated"
                ? "Saving…"
                : "Escalate to Supervisor"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
