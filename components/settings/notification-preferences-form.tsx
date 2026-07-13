"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { NotificationType } from "@prisma/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

type PreferenceItem = {
  type: NotificationType
  enabled: boolean
  label: string
  description: string
}

export function NotificationPreferencesForm() {
  const [items, setItems] = useState<PreferenceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/notifications")
    if (!res.ok) return
    const data = (await res.json()) as { preferences: PreferenceItem[] }
    setItems(data.preferences)
    setDirty(false)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  function toggle(type: NotificationType, enabled: boolean) {
    setItems((prev) =>
      prev.map((item) =>
        item.type === type ? { ...item, enabled } : item,
      ),
    )
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    const res = await fetch("/api/settings/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences: items.map(({ type, enabled }) => ({ type, enabled })),
      }),
    })
    setSaving(false)

    if (!res.ok) {
      toast.error("Failed to save notification preferences")
      return
    }

    const data = (await res.json()) as { preferences: PreferenceItem[] }
    setItems(data.preferences)
    setDirty(false)
    toast.success("Notification preferences saved")
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Notifications</CardTitle>
        <CardDescription>
          Choose which in-app notifications you want to receive. Disabled types
          will not appear in your notification bell going forward.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {items.map((item) => (
              <div
                key={item.type}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {item.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
                <Switch
                  checked={item.enabled}
                  onCheckedChange={(checked) => toggle(item.type, checked)}
                  aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.label}`}
                />
              </div>
            ))}
          </div>
        )}

        <Button onClick={save} disabled={!dirty || saving || loading}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </CardContent>
    </Card>
  )
}
