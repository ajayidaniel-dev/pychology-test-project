"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import type { PracticeStatus } from "@prisma/client"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  registrationNumber: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional(),
  addressLine: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  brandingTagline: z.string().trim().max(160).optional(),
})

type FormData = z.infer<typeof schema>

export function PracticeSettingsForm({
  initial,
  canActivate,
}: {
  initial: FormData & { slug: string; status: PracticeStatus }
  canActivate: boolean
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial.name,
      registrationNumber: initial.registrationNumber ?? "",
      contactEmail: initial.contactEmail ?? "",
      contactPhone: initial.contactPhone ?? "",
      addressLine: initial.addressLine ?? "",
      city: initial.city ?? "",
      country: initial.country ?? "",
      brandingTagline: initial.brandingTagline ?? "",
    },
    mode: "onTouched",
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const res = await fetch("/api/practice/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        registrationNumber: data.registrationNumber || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        addressLine: data.addressLine || null,
        city: data.city || null,
        country: data.country || null,
        brandingTagline: data.brandingTagline || null,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setServerError(body.error ?? "Could not save.")
      return
    }
    toast.success("Practice settings saved")
    router.refresh()
  }

  async function activate() {
    setActivating(true)
    setServerError(null)
    // Persist latest form values first so activation sees them.
    const data = form.getValues()
    const saveRes = await fetch("/api/practice/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        registrationNumber: data.registrationNumber || null,
        contactEmail: data.contactEmail || null,
        contactPhone: data.contactPhone || null,
        addressLine: data.addressLine || null,
        city: data.city || null,
        country: data.country || null,
        brandingTagline: data.brandingTagline || null,
      }),
    })
    if (!saveRes.ok) {
      const body = await saveRes.json().catch(() => ({}))
      setActivating(false)
      setServerError(body.error ?? "Could not save before activating.")
      return
    }

    const res = await fetch("/api/practice/activate", { method: "POST" })
    const body = await res.json().catch(() => ({}))
    setActivating(false)
    if (!res.ok) {
      setServerError(body.error ?? "Could not activate.")
      return
    }
    toast.success("Practice activated")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={initial.status === "ACTIVE" ? "secondary" : "outline"}>
          {initial.status === "ACTIVE"
            ? "Active"
            : initial.status === "SUSPENDED"
              ? "Suspended"
              : "Pending verification"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          /p/{initial.slug}/
        </span>
      </div>

      {initial.status === "PENDING_VERIFICATION" && (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Verification required</p>
          <p className="mt-1">
            Add a registration / licence number and contact email, then
            activate. Until then you can configure the practice but cannot
            create patients or invite staff.
          </p>
          {canActivate && (
            <Button
              className="mt-3"
              type="button"
              onClick={activate}
              disabled={activating || form.formState.isSubmitting}
            >
              {activating ? (
                <>
                  <Loader2 className="animate-spin" />
                  Activating…
                </>
              ) : (
                "Activate practice"
              )}
            </Button>
          )}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Practice name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="brandingTagline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patient-facing tagline</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Shown on questionnaire links"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Patients see your practice name; this optional line sits under
                  it on the fill experience.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration / licence number</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contactPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact phone</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="addressLine"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {serverError && <FormErrorAlert message={serverError} />}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || activating}
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
