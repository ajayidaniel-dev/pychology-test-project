"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PatientDetails } from "@/lib/consent"

interface DetailsStepProps {
  clinicianName: string | null
  onBack: () => void
  onContinue: (details: PatientDetails) => void
}

interface FieldErrors {
  fullName?: string
  email?: string
  phone?: string
  dateOfBirth?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function DetailsStep({
  clinicianName,
  onBack,
  onContinue,
}: DetailsStepProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [errors, setErrors] = useState<FieldErrors>({})

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (!fullName.trim()) next.fullName = "Please enter your name."
    if (!email.trim()) {
      next.email = "Please enter your email address."
    } else if (!EMAIL_RE.test(email.trim())) {
      next.email = "That doesn't look like a valid email address."
    }
    if (!phone.trim() || phone.trim().length < 3) {
      next.phone = "Please enter your phone number."
    }
    if (dateOfBirth && new Date(dateOfBirth) > new Date()) {
      next.dateOfBirth = "Date of birth can't be in the future."
    }
    return next
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onContinue({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    })
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">Your details</CardTitle>
        <CardDescription>
          Shared only with {clinicianName ?? "your clinician"}, so they can
          reach you about your care.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="details-name">Full name</Label>
            <Input
              id="details-name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "details-name-error" : undefined}
            />
            {errors.fullName && (
              <p id="details-name-error" className="text-xs text-destructive">
                {errors.fullName}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="details-email">Email</Label>
            <Input
              id="details-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "details-email-error" : undefined}
            />
            {errors.email && (
              <p id="details-email-error" className="text-xs text-destructive">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="details-phone">Phone number</Label>
            <Input
              id="details-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "details-phone-error" : undefined}
            />
            {errors.phone && (
              <p id="details-phone-error" className="text-xs text-destructive">
                {errors.phone}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="details-dob">
              Date of birth{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="details-dob"
              type="date"
              autoComplete="bday"
              max={new Date().toISOString().slice(0, 10)}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              aria-invalid={Boolean(errors.dateOfBirth)}
              aria-describedby={
                errors.dateOfBirth ? "details-dob-error" : undefined
              }
            />
            {errors.dateOfBirth && (
              <p id="details-dob-error" className="text-xs text-destructive">
                {errors.dateOfBirth}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="min-h-11 flex-1"
            >
              Back
            </Button>
            <Button type="submit" className="min-h-11 flex-[2]">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
