"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { signupSchema, type SignupFormData } from "@/lib/validation/signup"
import { cn } from "@/lib/utils"

export function SignUpForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
  })

  const { isSubmitting, touchedFields, errors } = form.formState
  const password = form.watch("password") ?? ""
  const email = form.watch("email") ?? ""
  const emailValid = Boolean(touchedFields.email) && !errors.email && email.length > 0
  const pending = isSubmitting || redirecting

  async function onSubmit(data: SignupFormData) {
    setServerError(null)

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => null)

      if (!res.ok) {
        setServerError(json?.error ?? "Failed to create account.")
        return
      }

      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setServerError(
          "Account could not be created or sign-in failed. If you already have an account, try signing in.",
        )
        return
      }

      toast.success("Account created")
      setRedirecting(true)
      router.push("/dashboard")
    } catch {
      // The original had no catch: a dropped connection left the button spinning
      // with no explanation.
      setServerError("Could not reach the server. Check your connection and try again.")
    }
  }

  return (
    <AuthCard
      title="Create your APAS account"
      description="Secure access for licensed clinicians. Use your professional email."
      banner={serverError ? <FormErrorAlert message={serverError} /> : null}
      focusOnChange={serverError}
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/auth/signin"
            className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Sign in
          </Link>
        </>
      }
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Jane Smith" autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="email"
                      inputMode="email"
                      placeholder="you@clinic.com"
                      autoComplete="email"
                      spellCheck={false}
                      className="pr-10"
                      {...field}
                    />
                    {/* Confirmation in the action colour, not green — the
                        severity ramp is reserved for patient risk. */}
                    <span
                      className={cn(
                        "pointer-events-none absolute top-1/2 right-3 flex size-4 -translate-y-1/2 items-center justify-center rounded-full bg-primary/15 text-primary",
                        "transition-[opacity,transform] duration-150 ease-out-quart",
                        emailValid ? "scale-100 opacity-100" : "scale-75 opacity-0",
                      )}
                      aria-hidden
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                  </div>
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete="new-password"
                    onFocus={() => setPasswordFocused(true)}
                    {...field}
                  />
                </FormControl>
                <PasswordStrength
                  password={password}
                  show={passwordFocused || password.length > 0}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="mt-1 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </Form>
    </AuthCard>
  )
}
