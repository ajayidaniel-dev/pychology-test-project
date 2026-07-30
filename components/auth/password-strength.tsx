"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getPasswordRequirements,
  getPasswordStrength,
} from "@/lib/validation/signup"

interface PasswordStrengthProps {
  password: string
  show: boolean
  className?: string
}

/**
 * Live requirement feedback for password fields.
 *
 * Colour stays inside the system: a single-hue intensity ramp, never
 * red/amber/green. Those four colours mean patient risk everywhere else in
 * APAS, and spending them on a password field weakens the one vocabulary that
 * must never be ambiguous.
 */
export function PasswordStrength({
  password,
  show,
  className,
}: PasswordStrengthProps) {
  if (!show) return null

  const requirements = getPasswordRequirements(password)
  const strength = getPasswordStrength(password)
  const metCount = requirements.filter((r) => r.met).length

  return (
    <div
      className={cn("flex flex-col gap-3 rounded-lg border bg-muted/40 p-3", className)}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-muted-foreground">
            Password strength
          </span>
          <span
            className={cn(
              "font-medium tabular-nums transition-opacity duration-150 ease-out-quart",
              strength.label ? "text-foreground opacity-100" : "opacity-0",
            )}
          >
            {strength.label || "—"}
          </span>
        </div>
        <div
          className="relative h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Password strength"
          aria-valuenow={strength.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={strength.label || "No password entered"}
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width,background-color] duration-250 ease-out-quart",
              strength.colorClass,
            )}
            style={{ width: `${strength.score}%` }}
          />
        </div>
      </div>

      {/* One live region for the whole checklist. Announcing each requirement
          separately turns a single keystroke into five interruptions. */}
      <p className="sr-only" aria-live="polite">
        {metCount} of {requirements.length} password requirements met.
      </p>

      <ul className="flex flex-col gap-1.5" aria-label="Password requirements">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full",
                "transition-colors duration-150 ease-out-quart",
                req.met
                  ? "bg-primary/15 text-primary"
                  : "border border-dashed bg-transparent text-transparent",
              )}
            >
              <Check
                className={cn(
                  "size-2.5 transition-transform duration-150 ease-out-quart",
                  req.met ? "scale-100" : "scale-50",
                )}
                strokeWidth={3}
                aria-hidden
              />
            </span>
            <span
              className={cn(
                "transition-colors duration-150 ease-out-quart",
                req.met ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
