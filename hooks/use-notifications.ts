"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  patientId: string | null
  sessionId: string | null
  readAt: string | null
  createdAt: string
}

const POLL_INTERVAL_MS = 60_000
const TOAST_TYPES = new Set(["SUICIDAL_IDEATION", "SEVERITY_CRITICAL"])

export function useNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initialFetchDone = useRef(false)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (!res.ok) return

      const data = (await res.json()) as {
        items: NotificationItem[]
        unreadCount: number
      }

      if (initialFetchDone.current) {
        for (const item of data.items) {
          if (
            !item.readAt &&
            TOAST_TYPES.has(item.type) &&
            !seenIdsRef.current.has(item.id)
          ) {
            toast.error(item.title, { description: item.body })
          }
        }
      } else {
        initialFetchDone.current = true
      }

      for (const item of data.items) {
        seenIdsRef.current.add(item.id)
      }

      setItems(data.items)
      setUnreadCount(data.unreadCount)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = useCallback(async (id: string) => {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    })
    if (!res.ok) return

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    )
    setUnreadCount((count) => Math.max(0, count - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    })
    if (!res.ok) return

    const now = new Date().toISOString()
    setItems((prev) => prev.map((item) => ({ ...item, readAt: item.readAt ?? now })))
    setUnreadCount(0)
  }, [])

  return {
    items,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  }
}
