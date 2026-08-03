"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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

const schema = z.object({
  email: signupEmailSchema,
  password: z.string().min(1, "Password is required"),
})

type FormData = z.infer<typeof schema>

/** Accept only same-origin relative paths so login can't redirect off-site. */
function safeCallbackUrl(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw
  if (raw) {
    try {
      const url = new URL(raw)
      if (typeof window !== "undefined" && url.origin === window.location.origin) {
        return url.pathname + url.search
      }
    } catch {
      // fall through to default
    }
  }
  return "/practice-redirect"
}

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered") === "1"
  const verified = searchParams.get("verified") === "1"
  const reset = searchParams.get("reset") === "1"
  const callbackUrl = searchParams.get("callbackUrl")

  const [serverError, setServerError] = useState<string | null>(null)
  const [emailNotVerified, setEmailNotVerified] = useState(false)
  const [bannersDismissed, setBannersDismissed] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle")

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const { isSubmitting } = form.formState
  const pending = isSubmitting || redirecting

  async function onSubmit(data: FormData) {
    setServerError(null)
    setEmailNotVerified(false)
    setResendState("idle")
    setBannersDismissed(true)

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error === "EMAIL_NOT_VERIFIED") {
      setEmailNotVerified(true)
      return
    }

    if (result?.error) {
      setServerError("Invalid email or password.")
      return
    }

    // Held true through navigation: clearing it would flash the idle button
    // back in before the new route paints.
    setRedirecting(true)
    router.push(safeCallbackUrl(callbackUrl))
  }

  async function resendVerification() {
    setResendState("sending")
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.getValues("email") }),
      })
      setResendState(res.ok ? "sent" : "idle")
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setServerError(body?.error ?? "Could not resend the email. Try again shortly.")
      }
    } catch {
      setResendState("idle")
      setServerError("Could not resend the email. Check your connection and try again.")
    }
  }

  const arrivalNotice = !bannersDismissed
    ? registered
      ? { title: "Account created", body: "Sign in below with your new credentials." }
      : verified
        ? { title: "Email verified", body: "You can sign in now." }
        : reset
          ? { title: "Password updated", body: "Sign in with your new password." }
          : null
    : null

  const banner = emailNotVerified ? (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>Email not verified</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <p>Verify your email address before signing in.</p>
        {resendState === "sent" ? (
          <p className="font-medium">Verification email sent — check your inbox.</p>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resendVerification}
            disabled={resendState === "sending"}
          >
            {resendState === "sending" ? (
              <>
                <Loader2 className="animate-spin" />
                Sending…
              </>
            ) : (
              "Resend verification email"
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  ) : serverError ? (
    <FormErrorAlert title="Sign-in failed" message={serverError} />
  ) : arrivalNotice ? (
    <Alert>
      <CheckCircle2 />
      <AlertTitle>{arrivalNotice.title}</AlertTitle>
      <AlertDescription>{arrivalNotice.body}</AlertDescription>
    </Alert>
  ) : null

  return (
    <AuthCard
      title="Sign in to APAS"
      description="Enter your credentials to continue."
      banner={banner}
      focusOnChange={serverError ?? (emailNotVerified || null)}
      footer={
        <>
          No account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none rounded-sm"
          >
            Create one
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Password</FormLabel>
                  <Link
                    href="/auth/forgot-password"
                    className="rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <PasswordInput autoComplete="current-password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-1 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  )
}
