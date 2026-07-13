"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import {
  QuestionItem,
  type NormalisedItem,
} from "@/components/questionnaire/question-item"

// Dev fallback only when dbItems is empty — prefer DB items in production.
const SCALE_OPTIONS = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
]

const PHQ9_ITEMS = [
  {
    number: 1,
    text: "Little interest or pleasure in doing things",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 2,
    text: "Feeling down, depressed, or hopeless",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 3,
    text: "Trouble falling or staying asleep, or sleeping too much",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 4,
    text: "Feeling tired or having little energy",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 5,
    text: "Poor appetite or overeating",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 6,
    text: "Feeling bad about yourself — or that you are a failure",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 7,
    text: "Trouble concentrating on things",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 8,
    text: "Moving or speaking so slowly that other people could have noticed",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 9,
    text: "Thoughts that you would be better off dead, or of hurting yourself",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
]

const GAD7_ITEMS = [
  {
    number: 1,
    text: "Feeling nervous, anxious, or on edge",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 2,
    text: "Not being able to stop or control worrying",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 3,
    text: "Worrying too much about different things",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 4,
    text: "Trouble relaxing",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 5,
    text: "Being so restless that it is hard to sit still",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 6,
    text: "Becoming easily annoyed or irritable",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
  {
    number: 7,
    text: "Feeling afraid as if something awful might happen",
    type: "MULTIPLE_CHOICE",
    options: SCALE_OPTIONS,
  },
]

const BDI2_DOMAIN_OPTIONS = [
  { label: "0", value: 0 },
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
]

const BDI2_ITEMS = [
  "Sadness",
  "Pessimism",
  "Past Failure",
  "Loss of Pleasure",
  "Guilty Feelings",
  "Punishment Feelings",
  "Self-Dislike",
  "Self-Criticalness",
  "Suicidal Thoughts or Wishes",
  "Crying",
  "Agitation",
  "Loss of Interest",
  "Indecisiveness",
  "Worthlessness",
  "Loss of Energy",
  "Changes in Sleeping Pattern",
  "Irritability",
  "Changes in Appetite",
  "Concentration Difficulty",
  "Tiredness or Fatigue",
  "Loss of Interest in Sex",
].map((text, i) => ({
  number: i + 1,
  text,
  type: "MULTIPLE_CHOICE",
  options: BDI2_DOMAIN_OPTIONS,
}))

const HARDCODED_ITEMS: Record<string, typeof PHQ9_ITEMS> = {
  PHQ9: PHQ9_ITEMS,
  GAD7: GAD7_ITEMS,
  BDI2: BDI2_ITEMS,
}

const SCALE_LABELS: Record<string, string> = {
  PHQ9: "Patient Health Questionnaire (PHQ-9)",
  GAD7: "Generalised Anxiety Disorder Assessment (GAD-7)",
  BDI2: "Beck Depression Inventory (BDI-II)",
}

interface DbItem {
  order: number
  text: string
  type: string
  options: { label: string; value: number | null }[]
}

interface Props {
  scale: string
  scaleName: string
  token: string
  description?: string | null
  dbItems?: DbItem[]
}

/** Split scale description into summary + patient instructions for display. */
function descriptionParagraphs(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  if (trimmed.includes("\n")) {
    return trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  }

  const instructionMatch = trimmed.match(
    /^(.+?\.)\s+((?:Over|In the|Please|How often|For each).+)$/i,
  )
  if (instructionMatch) {
    return [instructionMatch[1].trim(), instructionMatch[2].trim()]
  }

  return [trimmed]
}

function isAnswered(item: NormalisedItem, value: number | string | undefined) {
  if (value === undefined) return false
  if (item.type === "FREE_TEXT" || item.type === "NUMBER") {
    return String(value).trim() !== ""
  }
  return true
}

export function QuestionnaireStepForm({
  scale,
  scaleName,
  token,
  description,
  dbItems,
}: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [answers, setAnswers] = useState<Record<number, number | string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const items: NormalisedItem[] =
    dbItems && dbItems.length > 0
      ? dbItems.map((item) => ({
          number: item.order,
          text: item.text,
          type: item.type,
          options:
            item.type === "YES_NO"
              ? [
                  { label: "Yes", value: 1 },
                  { label: "No", value: 0 },
                ]
              : item.options.map((o) => ({
                  label: o.label,
                  value: o.value ?? 0,
                })),
        }))
      : (HARDCODED_ITEMS[scale] ?? [])

  const totalSteps = items.length
  const currentItem = items[currentStep - 1]
  const title = SCALE_LABELS[scale] ?? scaleName
  const showStandardIntro = scale === "PHQ9" || scale === "GAD7"
  const progressValue = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0

  const currentAnswered =
    currentItem && isAnswered(currentItem, answers[currentItem.number])

  const allAnswered = items.every((item) =>
    isAnswered(item, answers[item.number]),
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [currentStep])

  function goBack() {
    setCurrentStep((s) => Math.max(1, s - 1))
  }

  function goNext() {
    if (!currentAnswered) return
    setCurrentStep((s) => Math.min(totalSteps, s + 1))
  }

  async function onSubmit() {
    if (!allAnswered) return
    setSubmitting(true)
    setError(null)

    const itemScores: Record<string, number> = {}
    items.forEach((item) => {
      const val = answers[item.number]
      if (item.type === "FREE_TEXT") {
        itemScores[String(item.number)] = 0
      } else {
        itemScores[String(item.number)] = Number(val)
      }
    })

    const res = await fetch(`/api/fill/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemScores }),
    })

    if (!res.ok) {
      if (res.status === 410) {
        setError("This link has already been used.")
      } else if (res.status === 404) {
        setError(
          "This link is no longer valid. Contact your clinician for a new link.",
        )
      } else {
        setError(
          "Something went wrong. Please try again or contact your clinician.",
        )
      }
      setSubmitting(false)
      return
    }

    router.push(`/fill/${token}/complete`)
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This scale has no questions configured yet.
      </p>
    )
  }

  const isLastStep = currentStep === totalSteps

  return (
    <div className="pb-28 md:pb-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-lg font-semibold leading-snug">{title}</h1>
        </div>

        <div
          className="sticky top-[57px] z-[5] -mx-4 space-y-2 border-b border-border bg-background px-4 pb-4 pt-1"
          aria-current="step"
          aria-label={`Question ${currentStep} of ${totalSteps}`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Question {currentStep} of {totalSteps}
            </span>
            <span className="text-muted-foreground">
              {Math.round(progressValue)}%
            </span>
          </div>
          <Progress value={progressValue} />
        </div>

        {(showStandardIntro || description) && (
          <Alert>
            <AlertDescription>
              {showStandardIntro ? (
                <p className="font-medium text-foreground">
                  Over the last 2 weeks, how often have you been bothered by the
                  following?
                </p>
              ) : (
                descriptionParagraphs(description!).map((para, i) => (
                  <p
                    key={i}
                    className={
                      i > 0 ? "font-medium text-foreground" : undefined
                    }
                  >
                    {para}
                  </p>
                ))
              )}
            </AlertDescription>
          </Alert>
        )}

        {currentItem && (
          <QuestionItem
            key={currentItem.number}
            item={currentItem}
            value={answers[currentItem.number]}
            onChange={(val) =>
              setAnswers((prev) => ({ ...prev, [currentItem.number]: val }))
            }
            autofocus={
              currentItem.type === "NUMBER" ||
              currentItem.type === "FREE_TEXT"
            }
          />
        )}

        {error && <FormErrorAlert message={error} />}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mt-8 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-lg gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={currentStep === 1 || submitting}
            className="min-h-11 flex-1"
          >
            <ChevronLeft className="size-4" />
            Back
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={!allAnswered || submitting}
              className="min-h-11 flex-[2]"
            >
              {submitting ? "Submitting…" : "Submit responses"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={goNext}
              disabled={!currentAnswered || submitting}
              className="min-h-11 flex-[2]"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
