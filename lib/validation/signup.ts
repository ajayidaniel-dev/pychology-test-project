import { z } from "zod"

export const signupPasswordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number")
  .regex(/[^a-zA-Z0-9]/, "Include a special character (!@#$%^&* etc.)")

export const signupEmailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email is too long")
  .email("Enter a valid email address (e.g. you@clinic.com)")
  .transform((v) => v.toLowerCase())

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  email: signupEmailSchema,
  password: signupPasswordSchema,
})

export type SignupFormData = z.infer<typeof signupSchema>

export type PasswordRequirement = {
  id: string
  label: string
  met: boolean
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: "length", label: "At least 8 characters", met: password.length >= 8 },
    { id: "lower", label: "One lowercase letter", met: /[a-z]/.test(password) },
    { id: "upper", label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { id: "number", label: "One number", met: /[0-9]/.test(password) },
    {
      id: "special",
      label: "One special character",
      met: /[^a-zA-Z0-9]/.test(password),
    },
  ]
}

export type PasswordStrength = {
  score: number
  label: "Weak" | "Fair" | "Good" | "Strong" | ""
  colorClass: string
}

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "", colorClass: "bg-muted" }
  }

  const met = getPasswordRequirements(password).filter((r) => r.met).length

  if (met <= 2) {
    return { score: 25, label: "Weak", colorClass: "bg-destructive" }
  }
  if (met === 3) {
    return { score: 50, label: "Fair", colorClass: "bg-amber-500" }
  }
  if (met === 4) {
    return { score: 75, label: "Good", colorClass: "bg-primary" }
  }
  return { score: 100, label: "Strong", colorClass: "bg-emerald-500" }
}
