"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ConsentStep } from "@/components/questionnaire/consent-step"
import { DetailsStep } from "@/components/questionnaire/details-step"
import { IntakeStep } from "@/components/questionnaire/intake-step"
import { QuestionnaireStepForm } from "@/components/questionnaire/questionnaire-step-form"
import type { IntakeAnswers, PatientDetails } from "@/lib/consent"

interface DbItem {
  order: number
  text: string
  type: string
  options: { label: string; value: number | null }[]
}

export interface PendingQuestionnaire {
  id: string
  /** Enum key used for hardcoded fallback items and scale metadata. */
  scaleKey: string
  scaleName: string
  description: string | null
  items: DbItem[]
}

interface FillFlowProps {
  token: string
  sessionTitle: string
  questionnaires: PendingQuestionnaire[]
  practiceName: string | null
  clinicianName: string | null
  /** Effective value: link has collection enabled AND patient has no details yet. */
  collectDetails: boolean
}

type Step = "consent" | "details" | "intake" | "questionnaire"

/**
 * Drives one session's fill link end to end: consent (always) → details →
 * intake (both only when collectDetails) → each pending questionnaire in turn.
 *
 * Consent and identity are session-level and held client-side until the first
 * questionnaire is submitted, so nothing identifying is stored if the patient
 * abandons before answering anything.
 */
export function FillFlow({
  token,
  sessionTitle,
  questionnaires,
  practiceName,
  clinicianName,
  collectDetails,
}: FillFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("consent")
  const [details, setDetails] = useState<PatientDetails | null>(null)
  const [intake, setIntake] = useState<IntakeAnswers | null>(null)
  const [index, setIndex] = useState(0)
  /** Identity is sent once, with the first questionnaire only. */
  const [identitySent, setIdentitySent] = useState(false)

  const preSteps: Step[] = collectDetails
    ? ["consent", "details", "intake"]
    : ["consent"]

  const total = questionnaires.length
  const current = questionnaires[index]

  if (step !== "questionnaire") {
    const stepIndex = preSteps.indexOf(step)
    return (
      <div className="space-y-4 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          Before you begin
          {preSteps.length > 1 && ` · ${stepIndex + 1} of ${preSteps.length}`}
        </p>

        {step === "consent" && (
          <ConsentStep
            practiceName={practiceName}
            clinicianName={clinicianName}
            scaleName={
              total === 1
                ? questionnaires[0].scaleName
                : `${total} questionnaires`
            }
            collectDetails={collectDetails}
            onConsent={() =>
              setStep(collectDetails ? "details" : "questionnaire")
            }
          />
        )}

        {step === "details" && (
          <DetailsStep
            clinicianName={clinicianName}
            onBack={() => setStep("consent")}
            onContinue={(d) => {
              setDetails(d)
              setStep("intake")
            }}
          />
        )}

        {step === "intake" && (
          <IntakeStep
            onBack={() => setStep("details")}
            onContinue={(i) => {
              setIntake(i)
              setStep("questionnaire")
            }}
          />
        )}
      </div>
    )
  }

  if (!current) return null

  function onSubmitted() {
    setIdentitySent(true)
    if (index + 1 < total) {
      setIndex((i) => i + 1)
      return
    }
    router.push(`/fill/${token}/complete`)
  }

  return (
    <QuestionnaireStepForm
      key={current.id}
      scale={current.scaleKey}
      scaleName={current.scaleName}
      token={token}
      questionnaireId={current.id}
      description={current.description}
      dbItems={current.items}
      sequenceLabel={
        total > 1 ? `${sessionTitle} · ${index + 1} of ${total}` : null
      }
      isLastInSession={index + 1 === total}
      extraPayload={{
        consent: true,
        ...(details && !identitySent ? { details } : {}),
        ...(intake && !identitySent ? { intake } : {}),
      }}
      onSubmitted={onSubmitted}
    />
  )
}
