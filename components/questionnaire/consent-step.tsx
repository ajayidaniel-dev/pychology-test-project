"use client"

import { FileText, Lock, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface ConsentStepProps {
  practiceName: string | null
  clinicianName: string | null
  scaleName: string
  collectDetails: boolean
  onConsent: () => void
}

export function ConsentStep({
  practiceName,
  clinicianName,
  scaleName,
  collectDetails,
  onConsent,
}: ConsentStepProps) {
  const practice = practiceName ?? "your clinic"
  const clinician = clinicianName ?? "your clinician"

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">
          {clinicianName
            ? `${clinicianName} at ${practice} has asked you to complete the ${scaleName}`
            : `${practice} has asked you to complete the ${scaleName}`}
        </CardTitle>
        <CardDescription>
          Before you begin, here is exactly what happens with what you share.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ul className="space-y-4 text-sm">
          <li className="flex gap-3">
            <UserRound
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>
              <span className="font-medium">Who sees your answers.</span>{" "}
              Your questionnaire responses
              {collectDetails
                ? ", and the personal details you provide in the next steps,"
                : ""}{" "}
              are held by {practice} and visible to {clinician} and other staff
              at that practice who need them for your care. APAS does not use
              them for its own purposes.
            </span>
          </li>
          <li className="flex gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="font-medium">How APAS fits in.</span> APAS is
              the platform {practice} uses. It scores your responses and stores
              them securely on the practice&apos;s behalf
              {collectDetails
                ? " — identity details are stored only because you agree to it here"
                : " under an anonymous identifier"}
              . You can ask {clinician} to correct or delete your information
              at any time.
            </span>
          </li>
          <li className="flex gap-3">
            <FileText
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <span>
              <span className="font-medium">The full picture.</span> Read the{" "}
              <a
                href="/legal/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy policy
              </a>{" "}
              and{" "}
              <a
                href="/legal/retention"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                data retention policy
              </a>{" "}
              (they open in a new tab).
            </span>
          </li>
        </ul>

        <div className="space-y-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            By continuing you consent to {practice} processing your responses
            {collectDetails ? " and personal details" : ""} as described above
            and in the linked policies, using APAS as their platform. If you
            don&apos;t wish to continue, close this page and contact{" "}
            {clinician}.
          </p>
          <Button onClick={onConsent} className="min-h-11 w-full">
            I agree and consent
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
