import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { IntakeAnswers } from "@/lib/consent"

interface PatientDetailsCardProps {
  fullName: string | null
  email: string | null
  phone: string | null
  dateOfBirth: Date | null
  detailsUpdatedAt: Date | null
  consentAt: Date | null
  consentPolicyVersion: string | null
  intake: IntakeAnswers | null
}

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: "Employed",
  unemployed: "Unemployed",
  student: "Student",
  retired: "Retired",
  "unable-to-work": "Unable to work",
  "prefer-not-to-say": "Prefer not to say",
}

const LIVING_LABELS: Record<string, string> = {
  alone: "Alone",
  "with-family-or-partner": "With family or partner",
  "with-roommates": "With roommates",
  other: "Other",
  "prefer-not-to-say": "Prefer not to say",
}

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

function ageFrom(dob: Date) {
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  if (beforeBirthday) age -= 1
  return age
}

/*
 * Fixed label column with the value directly beside it. The previous
 * justify-between pushed values to the far right edge, so on a wide card the
 * eye had to cross the whole width to pair a label with its value — and
 * `truncate` silently cut long values (an email could lose its TLD). Values
 * now wrap instead of being clipped.
 */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[11rem_1fr] sm:gap-4 sm:py-1.5">
      <dt className="text-xs font-medium text-muted-foreground sm:pt-px">
        {label}
      </dt>
      <dd className="min-w-0 text-sm break-words">{value}</dd>
    </div>
  )
}

/**
 * Label-above-value in a recessed panel. Identity facts are read as a set —
 * "who is this person" — so they scan better as parallel columns than as a
 * stack of rows the eye has to descend one at a time. The inset surface marks
 * them as consent-gated data distinct from the clinical record around them.
 */
function FactPanel({ facts }: { facts: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-6 gap-y-4 rounded-lg bg-muted/50 p-4">
      {facts.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="min-w-0 text-sm wrap-break-word">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function PatientDetailsCard({
  fullName,
  email,
  phone,
  dateOfBirth,
  detailsUpdatedAt,
  consentAt,
  consentPolicyVersion,
  intake,
}: PatientDetailsCardProps) {
  const hasIdentity = Boolean(fullName || email || phone || dateOfBirth)
  const hasIntake = Boolean(
    intake &&
      (intake.familySize !== undefined ||
        intake.employment ||
        intake.livingSituation ||
        intake.lifeEvents),
  )

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Patient details</CardTitle>
        <CardDescription>
          {hasIdentity
            ? consentAt
              ? `Shared with consent on ${formatDate(consentAt)}${
                  consentPolicyVersion ? ` (policy ${consentPolicyVersion})` : ""
                }`
              : "On file"
            : "Anonymous — no details on file"}
        </CardDescription>
      </CardHeader>
      {(hasIdentity || hasIntake) && (
        <CardContent>
          {hasIdentity && (
            <FactPanel
              facts={[
                ...(fullName ? [{ label: "Name", value: fullName }] : []),
                ...(email
                  ? [
                      {
                        label: "Email",
                        value: (
                          <a
                            href={`mailto:${email}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {email}
                          </a>
                        ),
                      },
                    ]
                  : []),
                ...(phone
                  ? [
                      {
                        label: "Phone",
                        value: (
                          <a
                            href={`tel:${phone}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {phone}
                          </a>
                        ),
                      },
                    ]
                  : []),
                ...(dateOfBirth
                  ? [
                      {
                        label: "Date of birth",
                        value: `${formatDate(dateOfBirth)} · age ${ageFrom(dateOfBirth)}`,
                      },
                    ]
                  : []),
                ...(detailsUpdatedAt
                  ? [{ label: "Updated", value: formatDate(detailsUpdatedAt) }]
                  : []),
              ]}
            />
          )}

          {hasIntake && intake && (
            <div className={hasIdentity ? "mt-5 border-t pt-4" : undefined}>
              {/* Uppercase + tracking so this reads as a section heading rather
                  than just another field label at the same weight. */}
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Intake context
              </p>
              <dl className="divide-y divide-border/60">
                {intake.familySize !== undefined && (
                  <Row label="Household size" value={intake.familySize} />
                )}
                {intake.employment && (
                  <Row
                    label="Employment"
                    value={
                      EMPLOYMENT_LABELS[intake.employment] ?? intake.employment
                    }
                  />
                )}
                {intake.livingSituation && (
                  <Row
                    label="Living situation"
                    value={
                      LIVING_LABELS[intake.livingSituation] ??
                      intake.livingSituation
                    }
                  />
                )}
              </dl>
              {intake.lifeEvents && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Recent life events
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {intake.lifeEvents}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
