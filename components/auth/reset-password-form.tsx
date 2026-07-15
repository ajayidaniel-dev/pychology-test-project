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
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
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
  const passwordValue = form.watch("password")

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

  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader>
        <h1 data-slot="card-title" className="text-2xl leading-none font-semibold">
          Choose a new password
        </h1>
        <CardDescription>
          It will replace your old password immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!token ? (
            <>
              <FormErrorAlert
                title="Missing reset link"
                message="This page needs a valid reset link. Request a new one and open the link from your email."
              />
              <Button variant="outline" className="w-full" asChild>
                <Link href="/auth/forgot-password">Request a new link</Link>
              </Button>
            </>
          ) : (
            <>
              {serverError && (
                <div className="space-y-3">
                  <FormErrorAlert title="Reset failed" message={serverError} />
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/auth/forgot-password">Request a new link</Link>
                  </Button>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New password</FormLabel>
                        <FormControl>
                          <PasswordInput autoComplete="new-password" autoFocus {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <PasswordStrength
                    password={passwordValue}
                    show={passwordValue.length > 0}
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

                  <Button type="submit" className="w-full" disabled={pending}>
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
