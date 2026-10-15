"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Loader2, UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ASSIGNABLE_ROLES, ROLE_LABELS } from "@/lib/roles"

const schema = z.object({
  email: z.string().email("Enter a valid email address").max(320),
  role: z.enum(["ADMIN", "CLINICIAN", "SUPERVISOR", "FRONT_DESK"]),
  areaIds: z.array(z.string()).optional(),
})

type FormData = z.infer<typeof schema>

interface InviteMemberDialogProps {
  trigger?: React.ReactNode
  areas?: { id: string; name: string }[]
}

export function InviteMemberDialog({
  trigger,
  areas = [],
}: InviteMemberDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [areaIds, setAreaIds] = useState<string[]>([])

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "CLINICIAN", areaIds: [] },
    mode: "onTouched",
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const res = await fetch("/api/team/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, areaIds }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setServerError(body.error ?? "Failed to send invitation.")
      return
    }
    toast.success(
      body.existingUser
        ? "Invitation sent — they will see it in APAS"
        : "Invitation sent",
    )
    setOpen(false)
    setAreaIds([])
    form.reset({ email: "", role: "CLINICIAN", areaIds: [] })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UserPlus className="size-4" />
            Invite member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to this practice</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="colleague@clinic.example"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    If they already use APAS, they accept in one click — no
                    second account.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {areas.length > 0 && (
              <div className="flex flex-col gap-2">
                <FormLabel>Areas</FormLabel>
                <div className="flex flex-col gap-2">
                  {areas.map((area) => {
                    const checked = areaIds.includes(area.id)
                    return (
                      <label
                        key={area.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setAreaIds((prev) =>
                              checked
                                ? prev.filter((id) => id !== area.id)
                                : [...prev, area.id],
                            )
                          }
                        />
                        {area.name}
                      </label>
                    )
                  })}
                </div>
              </div>
            )}
            {serverError && <FormErrorAlert message={serverError} />}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
