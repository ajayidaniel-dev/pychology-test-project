"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { AuthCard } from "@/components/auth/auth-card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { signupEmailSchema } from "@/lib/validation/signup"

const schema = z.object({ email: signupEmailSchema })

type FormData = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: FormData) {
    setServerError(null)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setServerError(body?.error ?? "Something didn't work. Try again shortly.")
        return
      }
      setSentTo(data.email)
    } catch {
      setServerError("Could not reach the server. Check your connection and try again.")
    }
  }

  // Success replaces the form rather than stacking a banner above it: there is
  // no longer anything to submit, so leaving the field live invites a resend
  // the rate limiter will reject.
  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        description={
          <>
            If an account exists for{" "}
            <span className="font-medium text-foreground">{sentTo}</span>, a reset
            link is on its way.
          </>
        }
      >
        <div className="flex flex-col gap-4" role="status">
          <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <div className="flex flex-col gap-1 text-sm">
              <p className="font-medium">The link expires in 1 hour.</p>
              <p className="text-muted-foreground">
                Not there? Check your spam folder before requesting another.
              </p>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/signin">Back to sign in</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you sign in with and we'll send you a reset link."
      banner={
        serverError ? (
          <FormErrorAlert title="Request failed" message={serverError} />
        ) : null
      }
      focusOnChange={serverError}
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/auth/signin"
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Sending link…
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  )
}
