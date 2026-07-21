"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  ClipboardList,
  Gauge,
  MessageCircleQuestion,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { cn } from "@/lib/utils"
import type { ClinicalNarrative } from "@/app/api/narrative/route"

interface Props {
  sessionId: string
  questionnaireId: string
  patientId: string
  initialReviewed?: boolean
}

type ChatMessage = { role: "user" | "assistant"; content: string }

const MAX_CHAT_MESSAGES = 20

const PRIORITY_STYLES: Record<
  ClinicalNarrative["followUpPriority"],
  { label: string; className: string }
> = {
  routine: {
    label: "Routine follow-up",
    className:
      "border-severity-low/40 bg-severity-low/10 text-severity-low",
  },
  priority: {
    label: "Priority follow-up",
    className:
      "border-severity-moderate/40 bg-severity-moderate/10 text-severity-moderate",
  },
  urgent: {
    label: "Urgent follow-up",
    className: "border-destructive/40 bg-destructive/10 text-destructive",
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

export function NarrativePanel({
  sessionId,
  questionnaireId,
  patientId,
  initialReviewed = false,
}: Props) {
  const [narrative, setNarrative] = useState<ClinicalNarrative | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(initialReviewed)
  const [savingReview, setSavingReview] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatMessages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    }
  }, [chatMessages, chatLoading])

  const fetchNarrative = useCallback(
    async (regenerate = false) => {
      if (regenerate) setRegenerating(true)
      else setLoading(true)
      setError(null)

      try {
        const res = await fetch("/api/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId, questionnaireId, regenerate }),
        })
        const data = await res.json().catch(() => null)
        if (!res.ok || !data) {
          throw new Error(data?.error ?? `Failed to generate summary (HTTP ${res.status})`)
        }
        setNarrative(data.narrative)
        setGeneratedAt(data.generatedAt ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate summary.")
      } finally {
        setLoading(false)
        setRegenerating(false)
      }
    },
    [patientId, questionnaireId],
  )

  useEffect(() => {
    fetchNarrative()
  }, [fetchNarrative])

  async function markReviewed() {
    setSavingReview(true)
    const res = await fetch(
      `/api/patients/${patientId}/sessions/${sessionId}/questionnaires/${questionnaireId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reviewed" }),
      },
    )
    setSavingReview(false)

    if (!res.ok) {
      toast.error("Failed to mark as reviewed")
      return
    }
    setReviewed(true)
    toast.success("Marked as reviewed")
  }

  async function sendChatMessage(e: React.FormEvent) {
    e.preventDefault()
    const question = chatInput.trim()
    if (!question || chatLoading) return

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: question },
    ]
    setChatMessages(nextMessages)
    setChatInput("")
    setChatLoading(true)

    try {
      const res = await fetch("/api/narrative/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId, questionnaireId, messages: nextMessages }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.reply) {
        throw new Error(data?.error ?? `Failed to get an answer (HTTP ${res.status})`)
      }
      setChatMessages([...nextMessages, { role: "assistant", content: data.reply }])
    } catch (err) {
      // Roll back the optimistic user message so it can be retried
      setChatMessages(chatMessages)
      setChatInput(question)
      toast.error(err instanceof Error ? err.message : "Failed to get an answer")
    } finally {
      setChatLoading(false)
    }
  }

  const chatLimitReached = chatMessages.length >= MAX_CHAT_MESSAGES
  const priority = narrative ? PRIORITY_STYLES[narrative.followUpPriority] : null

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4 text-muted-foreground" aria-hidden />
            AI Clinical Summary
          </CardTitle>
          <CardDescription>
            AI-generated summary for clinician review only. Not a substitute
            for professional clinical judgment.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {reviewed && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="size-3" />
              Reviewed
            </Badge>
          )}
          {priority && !loading && (
            <Badge variant="outline" className={cn("gap-1", priority.className)}>
              <Gauge className="size-3" />
              {priority.label}
            </Badge>
          )}
        </div>
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
                onClick={() => fetchNarrative()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {narrative && !loading && (
          <div aria-live="polite" className="space-y-5">
            <Section icon={Sparkles} title="Overall severity">
              {narrative.overallSeverity}
            </Section>

            <Section icon={ClipboardList} title="Item-level patterns">
              {narrative.itemPatterns}
            </Section>

            {narrative.trend && (
              <Section icon={TrendingUp} title="Trend across sessions">
                {narrative.trend}
              </Section>
            )}

            {narrative.safetyConcern ? (
              <Alert variant="destructive" role="alert">
                <AlertTriangle />
                <AlertTitle>Safety</AlertTitle>
                <AlertDescription>{narrative.safety}</AlertDescription>
              </Alert>
            ) : (
              <Section icon={ShieldCheck} title="Safety">
                {narrative.safety}
              </Section>
            )}

            <Section icon={Gauge} title="Recommended follow-up">
              {narrative.followUpRationale}
            </Section>
          </div>
        )}

        {narrative && !loading && (
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageCircleQuestion className="size-3.5" aria-hidden />
                Ask about this summary
              </h4>
              <span className="text-xs text-muted-foreground">
                Not saved to the record
              </span>
            </div>

            {chatMessages.length > 0 && (
              <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-3">
                {chatMessages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex",
                      m.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed sm:max-w-[75%]",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background shadow-sm",
                      )}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-background px-3 py-2 shadow-sm">
                      <span className="text-sm text-muted-foreground">Thinking…</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            )}

            <form onSubmit={sendChatMessage} className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  chatLimitReached
                    ? "Question limit reached for this session"
                    : "e.g. Why is this rated routine follow-up?"
                }
                maxLength={2000}
                disabled={chatLoading || chatLimitReached}
                aria-label="Ask a question about this summary"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 shrink-0"
                disabled={chatLoading || chatLimitReached || !chatInput.trim()}
                aria-label="Send question"
              >
                <Send className="size-4" aria-hidden />
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </form>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => !reviewed && markReviewed()}
              disabled={reviewed || savingReview}
            >
              {reviewed ? "Reviewed" : savingReview ? "Saving…" : "Mark Reviewed"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground sm:w-auto"
              onClick={() => fetchNarrative(true)}
              disabled={loading || regenerating}
            >
              <RefreshCw
                className={cn("size-3.5", regenerating && "animate-spin")}
                aria-hidden
              />
              {regenerating ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
          {generatedAt && !loading && (
            <p className="text-xs text-muted-foreground">
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
