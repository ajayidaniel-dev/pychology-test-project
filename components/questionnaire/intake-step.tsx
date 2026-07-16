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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { IntakeAnswers } from "@/lib/consent"

interface IntakeStepProps {
  onBack: () => void
  onContinue: (intake: IntakeAnswers) => void
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

export function IntakeStep({ onBack, onContinue }: IntakeStepProps) {
  const [familySize, setFamilySize] = useState("")
  const [employment, setEmployment] = useState("")
  const [livingSituation, setLivingSituation] = useState("")
  const [lifeEvents, setLifeEvents] = useState("")

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedSize = Number.parseInt(familySize, 10)
    onContinue({
      familySize:
        Number.isFinite(parsedSize) && parsedSize >= 1 && parsedSize <= 50
          ? parsedSize
          : undefined,
      employment: (employment || undefined) as IntakeAnswers["employment"],
      livingSituation: (livingSituation ||
        undefined) as IntakeAnswers["livingSituation"],
      lifeEvents: lifeEvents.trim() ? lifeEvents.trim().slice(0, 2000) : undefined,
    })
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">
          A little context
        </CardTitle>
        <CardDescription>
          These help your clinician understand your situation. Every question
          is optional — skip anything you&apos;d rather not answer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="intake-family-size">
              How many people live in your household, including you?
            </Label>
            <Input
              id="intake-family-size"
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              value={familySize}
              onChange={(e) => setFamilySize(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="intake-employment">
              What is your current work situation?
            </Label>
            <Select value={employment} onValueChange={setEmployment}>
              <SelectTrigger id="intake-employment" className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="intake-living">Who do you live with?</Label>
            <Select value={livingSituation} onValueChange={setLivingSituation}>
              <SelectTrigger id="intake-living" className="w-full">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LIVING_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="intake-events">
              Any major life events recently?{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="intake-events"
              rows={3}
              maxLength={2000}
              placeholder="For example: bereavement, job loss, separation…"
              value={lifeEvents}
              onChange={(e) => setLifeEvents(e.target.value)}
            />
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
