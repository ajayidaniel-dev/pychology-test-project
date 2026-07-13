"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
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

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "" },
    mode: "onTouched",
    reValidateMode: "onChange",
  })

  const { isSubmitting, touchedFields, errors } = form.formState
  const password = form.watch("password") ?? ""
  const email = form.watch("email") ?? ""
  const emailValid = touchedFields.email && !errors.email && email.length > 0

  async function onSubmit(data: SignupFormData) {
    setServerError(null)

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = await res.json()

    if (!res.ok) {
      setServerError(json.error ?? "Failed to create account")
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
    router.push("/dashboard")
  }

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create your APAS account</CardTitle>
        <CardDescription>
          Secure access for licensed clinicians. Use your professional email.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {serverError && <FormErrorAlert message={serverError} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Dr. Jane Smith"
                        autoComplete="name"
                        {...field}
                      />
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
                          className={cn(emailValid && "pr-10")}
                          {...field}
                        />
                        {emailValid && (
                          <CheckCircle2
                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500"
                            aria-hidden
                          />
                        )}
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
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

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
