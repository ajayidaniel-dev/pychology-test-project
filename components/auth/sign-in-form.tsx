"use client"

import { useEffect, useRef, useState } from "react"
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
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
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
  return "/dashboard"
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
  const errorRef = useRef<HTMLDivElement>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const { isSubmitting } = form.formState
  const pending = isSubmitting || redirecting

  // Move focus to the error so keyboard users land on the explanation, not a
  // silently re-enabled button.
  useEffect(() => {
    if (serverError || emailNotVerified) errorRef.current?.focus()
  }, [serverError, emailNotVerified])

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

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader>
        <h1 data-slot="card-title" className="text-2xl leading-none font-semibold">
          Sign in to APAS
        </h1>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {registered && !bannersDismissed && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>Sign in below with your new credentials.</AlertDescription>
            </Alert>
          )}

          {verified && !bannersDismissed && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Email verified</AlertTitle>
              <AlertDescription>You can sign in now.</AlertDescription>
            </Alert>
          )}

          {reset && !bannersDismissed && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Password updated</AlertTitle>
              <AlertDescription>Sign in with your new password.</AlertDescription>
            </Alert>
          )}

          {emailNotVerified && (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
            <Alert variant="destructive">
              <AlertCircle />
              <AlertTitle>Email not verified</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Verify your email address before signing in.</p>
                {resendState === "sent" ? (
                  <p className="font-medium">
                    Verification email sent — check your inbox.
                  </p>
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
            </div>
          )}

          {serverError && !emailNotVerified && (
            <div
              ref={errorRef}
              tabIndex={-1}
              className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <FormErrorAlert title="Sign-in failed" message={serverError} />
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" autoFocus {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        href="/auth/forgot-password"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
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

              <Button type="submit" className="w-full" disabled={pending}>
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

          <p className="text-center text-sm text-muted-foreground">
            No account?{" "}
            <Button variant="link" className="-my-2 h-auto px-1 py-2" asChild>
              <Link href="/auth/signup">Create one</Link>
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
