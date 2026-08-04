"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
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
import { slugifyPracticeName } from "@/lib/practice-slug"
import { PRACTICE_COOKIE } from "@/lib/practice"

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers, and hyphens only",
    ),
  registrationNumber: z.string().trim().max(120).optional(),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  areaNames: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function CreatePracticeForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [slugTouched, setSlugTouched] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
      registrationNumber: "",
      contactEmail: "",
      city: "",
      country: "",
      areaNames: "",
    },
    mode: "onTouched",
  })

  const name = form.watch("name")
  const suggested = useMemo(() => slugifyPracticeName(name || ""), [name])

  async function onSubmit(data: FormData) {
    setServerError(null)
    const areaNames = (data.areaNames ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const res = await fetch("/api/practices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        slug: data.slug,
        registrationNumber: data.registrationNumber || null,
        contactEmail: data.contactEmail || null,
        city: data.city || null,
        country: data.country || null,
        areaNames: areaNames.length > 0 ? areaNames : undefined,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setServerError(body.error ?? "Could not create practice.")
      return
    }
    toast.success("Practice created")
    if (body.slug) {
      document.cookie = `${PRACTICE_COOKIE}=${encodeURIComponent(body.slug)}; path=/; max-age=31536000; samesite=lax`
    }
    router.push(body.href ?? `/p/${body.slug}/settings`)
    router.refresh()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Practice name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Renaissance Psychological Services"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e)
                    if (!slugTouched) {
                      form.setValue("slug", slugifyPracticeName(e.target.value), {
                        shouldValidate: true,
                      })
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL slug</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(e) => {
                    setSlugTouched(true)
                    field.onChange(e.target.value.toLowerCase())
                  }}
                />
              </FormControl>
              <FormDescription>
                Appears in links as /p/{field.value || suggested || "…"}/
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
                <Input placeholder="Required before you can activate" {...field} />
              </FormControl>
              <FormDescription>
                Needed to leave pending verification and create patients.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Practice contact email</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
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
        <FormField
          control={form.control}
          name="areaNames"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Areas (optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Cognitive, Forensic — comma separated"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Leave blank for a single General area. You can edit areas later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && <FormErrorAlert message={serverError} />}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              Creating…
            </>
          ) : (
            "Create practice"
          )}
        </Button>
      </form>
    </Form>
  )
}
