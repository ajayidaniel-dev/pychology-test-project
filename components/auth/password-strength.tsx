"use client"

import { Check, X } from "lucide-react"
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

export function PasswordStrength({ password, show, className }: PasswordStrengthProps) {
  if (!show) return null

  const requirements = getPasswordRequirements(password)
  const strength = getPasswordStrength(password)
  const allMet = requirements.every((r) => r.met)

  return (
    <div
      className={cn("space-y-3 rounded-lg border bg-muted/40 p-3", className)}
      aria-live="polite"
    >
      {password.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Password strength</span>
            {strength.label && (
              <span
                className={cn(
                  "font-medium",
                  strength.label === "Weak" && "text-destructive",
                  strength.label === "Fair" && "text-amber-600 dark:text-amber-400",
                  strength.label === "Good" && "text-primary",
                  strength.label === "Strong" && "text-emerald-600 dark:text-emerald-400",
                )}
              >
                {strength.label}
              </span>
            )}
          </div>
          <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300 ease-out",
                strength.colorClass,
              )}
              style={{ width: `${strength.score}%` }}
            />
          </div>
        </div>
      )}

      <ul className="space-y-1.5" aria-label="Password requirements">
        {requirements.map((req) => (
          <li key={req.id} className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                req.met
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {req.met ? (
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              ) : (
                <X className="h-2.5 w-2.5" strokeWidth={3} />
              )}
            </span>
            <span
              className={cn(
                req.met ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {req.label}
            </span>
          </li>
        ))}
      </ul>

      {allMet && password.length > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">
          Password meets all requirements.
        </p>
      )}
    </div>
  )
}
