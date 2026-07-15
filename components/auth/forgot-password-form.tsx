"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader>
        <h1 data-slot="card-title" className="text-2xl leading-none font-semibold">
          Reset your password
        </h1>
        <CardDescription>
          Enter the email you sign in with and we&rsquo;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sentTo ? (
            <>
              <Alert>
                <CheckCircle2 />
                <AlertTitle>Check your inbox</AlertTitle>
                <AlertDescription>
                  If an account exists for {sentTo}, a reset link is on its way. The
                  link expires in 1 hour.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/signin">Back to sign in</Link>
              </Button>
            </>
          ) : (
            <>
              {serverError && (
                <FormErrorAlert title="Request failed" message={serverError} />
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

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
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

              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Button variant="link" className="-my-2 h-auto px-1 py-2" asChild>
                  <Link href="/auth/signin">Back to sign in</Link>
                </Button>
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
