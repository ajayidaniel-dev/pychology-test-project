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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right text-sm">{value}</dd>
    </div>
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
            <dl className="divide-y divide-border/60">
              {fullName && <Row label="Name" value={fullName} />}
              {email && (
                <Row
                  label="Email"
                  value={
                    <a
                      href={`mailto:${email}`}
                      className="text-primary hover:underline"
                    >
                      {email}
                    </a>
                  }
                />
              )}
              {phone && (
                <Row
                  label="Phone"
                  value={
                    <a
                      href={`tel:${phone}`}
                      className="text-primary hover:underline"
                    >
                      {phone}
                    </a>
                  }
                />
              )}
              {dateOfBirth && (
                <Row
                  label="Date of birth"
                  value={`${formatDate(dateOfBirth)} (age ${ageFrom(dateOfBirth)})`}
                />
              )}
              {detailsUpdatedAt && (
                <Row label="Updated" value={formatDate(detailsUpdatedAt)} />
              )}
            </dl>
          )}

          {hasIntake && intake && (
            <div className={hasIdentity ? "mt-4 border-t pt-3" : undefined}>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
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
