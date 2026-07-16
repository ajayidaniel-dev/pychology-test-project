import { z } from "zod"

/**
 * Version stamp recorded on every session at consent time. Bump whenever the
 * published legal documents change materially, so each consent record proves
 * which policy text the patient agreed to. Matches the legal pages'
 * "Last updated" date.
 */
export const CONSENT_POLICY_VERSION = "2026-07-16"

export const EMPLOYMENT_OPTIONS = [
  "employed",
  "unemployed",
  "student",
  "retired",
  "unable-to-work",
  "prefer-not-to-say",
] as const

export const LIVING_SITUATION_OPTIONS = [
  "alone",
  "with-family-or-partner",
  "with-roommates",
  "other",
  "prefer-not-to-say",
] as const

export const PatientDetailsSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(3).max(40),
  dateOfBirth: z.coerce.date().max(new Date()).optional(),
})

export const IntakeSchema = z
  .object({
    familySize: z.number().int().min(1).max(50).optional(),
    employment: z.enum(EMPLOYMENT_OPTIONS).optional(),
    livingSituation: z.enum(LIVING_SITUATION_OPTIONS).optional(),
    lifeEvents: z.string().trim().max(2000).optional(),
  })
  .strict()

export type PatientDetails = z.infer<typeof PatientDetailsSchema>
export type IntakeAnswers = z.infer<typeof IntakeSchema>
