"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { PasswordStrength } from "@/components/auth/password-strength"
import { signupPasswordSchema } from "@/lib/validation/signup"

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: signupPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormData = z.infer<typeof schema>

export function PasswordSettingsForm() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [newPasswordFocused, setNewPasswordFocused] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  })

  const newPassword = form.watch("newPassword") ?? ""

  async function onSubmit(data: FormData) {
    setServerError(null)
    const res = await fetch("/api/settings/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const body = await res.json()
      const fieldErrors = body.error
      if (fieldErrors?.currentPassword?.[0]) {
        form.setError("currentPassword", {
          message: fieldErrors.currentPassword[0],
        })
      }
      if (fieldErrors?.newPassword?.[0]) {
        form.setError("newPassword", { message: fieldErrors.newPassword[0] })
      }
      if (fieldErrors?.confirmPassword?.[0]) {
        form.setError("confirmPassword", {
          message: fieldErrors.confirmPassword[0],
        })
      }
      if (
        !fieldErrors?.currentPassword &&
        !fieldErrors?.newPassword &&
        !fieldErrors?.confirmPassword
      ) {
        setServerError(
          typeof body.error === "string"
            ? body.error
            : "Failed to update password. Please try again.",
        )
      }
      return
    }

    toast.success("Password updated")
    form.reset()
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
        <CardDescription>
          Change your password. You will stay signed in on this device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && <FormErrorAlert message={serverError} />}

            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="current-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      onFocus={() => setNewPasswordFocused(true)}
                      onBlur={() => setNewPasswordFocused(false)}
                      {...field}
                    />
                  </FormControl>
                  <PasswordStrength
                    password={newPassword}
                    show={newPasswordFocused || newPassword.length > 0}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete="new-password"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Updating…" : "Update password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
