"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { AuthCard } from "@/components/auth/auth-card"
import { PasswordStrength } from "@/components/auth/password-strength"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { signupPasswordSchema } from "@/lib/validation/signup"

const schema = z
  .object({
    password: signupPasswordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Passwords don't match",
  })

type FormData = z.infer<typeof schema>

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [serverError, setServerError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  })

  const { isSubmitting } = form.formState
  const pending = isSubmitting || redirecting
  const passwordValue = form.watch("password") ?? ""

  async function onSubmit(data: FormData) {
    if (!token) return
    setServerError(null)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setServerError(body?.error ?? "Something didn't work. Try again shortly.")
        return
      }
      setRedirecting(true)
      router.replace("/auth/signin?reset=1")
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.")
    }
  }

  // A reset page with no token is a dead end, not a form with an error on it.
  if (!token) {
    return (
      <AuthCard
        title="This link is incomplete"
        description="Password reset links expire and can only be used once. Request a fresh one and open it directly from your email."
      >
        <Button className="w-full" asChild>
          <Link href="/auth/forgot-password">Request a new link</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="It replaces your old password immediately, on every device."
      banner={
        serverError ? (
          <div className="flex flex-col items-start gap-3">
            <FormErrorAlert title="Reset failed" message={serverError} />
            <Button variant="outline" size="sm" asChild>
              <Link href="/auth/forgot-password">Request a new link</Link>
            </Button>
          </div>
        ) : null
      }
      focusOnChange={serverError}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" autoFocus {...field} />
                </FormControl>
                <PasswordStrength
                  password={passwordValue}
                  show={passwordValue.length > 0}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm new password</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-1 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Updating password…
              </>
            ) : (
              "Update password"
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  )
}
