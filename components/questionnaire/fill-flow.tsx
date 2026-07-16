"use client"

import { useState } from "react"
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

interface FillFlowProps {
  scale: string
  scaleName: string
  token: string
  description?: string | null
  dbItems?: DbItem[]
  clinicianName: string | null
  /** Effective value: link has collection enabled AND patient has no details yet. */
  collectDetails: boolean
}

type Step = "consent" | "details" | "intake" | "questionnaire"

/**
 * Pre-questionnaire stepper: consent (always) → details → intake (both only
 * when collectDetails). Everything is held client-side and submitted in one
 * POST at the end, so nothing identifying is stored if the patient abandons.
 */
export function FillFlow({
  scale,
  scaleName,
  token,
  description,
  dbItems,
  clinicianName,
  collectDetails,
}: FillFlowProps) {
  const [step, setStep] = useState<Step>("consent")
  const [details, setDetails] = useState<PatientDetails | null>(null)
  const [intake, setIntake] = useState<IntakeAnswers | null>(null)

  const preSteps: Step[] = collectDetails
    ? ["consent", "details", "intake"]
    : ["consent"]

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
            clinicianName={clinicianName}
            scaleName={scaleName}
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

  return (
    <QuestionnaireStepForm
      scale={scale}
      scaleName={scaleName}
      token={token}
      description={description}
      dbItems={dbItems}
      extraPayload={{
        consent: true,
        ...(details ? { details } : {}),
        ...(intake ? { intake } : {}),
      }}
    />
  )
}
