"use client"

import { useState } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
})

type FormData = z.infer<typeof schema>

export function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered") === "1"
  const verified = searchParams.get("verified") === "1"
  const [serverError, setServerError] = useState<string | null>(null)
  const [emailNotVerified, setEmailNotVerified] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(data: FormData) {
    setServerError(null)
    setEmailNotVerified(false)

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
      const statusRes = await fetch(
        `/api/auth/verification-status?email=${encodeURIComponent(data.email)}`,
      )
      if (statusRes.ok) {
        const { unverified } = await statusRes.json()
        if (unverified) {
          setEmailNotVerified(true)
          return
        }
      }
      setServerError("Invalid email or password.")
      return
    }

    router.push("/dashboard")
  }

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to APAS</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {registered && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>Sign in below with your new credentials.</AlertDescription>
            </Alert>
          )}

          {verified && (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Email verified</AlertTitle>
              <AlertDescription>You can sign in now.</AlertDescription>
            </Alert>
          )}

          {emailNotVerified && (
            <FormErrorAlert
              title="Email not verified"
              message="Please verify your email address before signing in. Check your inbox for a verification link."
            />
          )}

          {serverError && <FormErrorAlert message={serverError} />}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
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
                      <PasswordInput autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
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
            <Button variant="link" className="h-auto p-0" asChild>
              <Link href="/auth/signup">Create one</Link>
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
