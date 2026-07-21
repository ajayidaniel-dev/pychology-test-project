"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EmptyState } from "@/components/layout/empty-state"
import { SectionHeader } from "@/components/layout/section-header"
import { FormErrorAlert } from "@/components/ui/form-error-alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  noteAttachmentLabel,
  type NoteRecord,
  type NoteTarget,
} from "@/components/notes/note-target"

interface NotesSectionProps {
  patientId: string
  /**
   * Where new notes land by default and which existing notes are listed.
   * The patient page passes the patient target and every session/questionnaire
   * as options; a session or questionnaire page passes just its own.
   */
  defaultTarget: NoteTarget
  targets: NoteTarget[]
  title?: string
  emptyDescription?: string
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function NotesSection({
  patientId,
  defaultTarget,
  targets,
  title = "Notes",
  emptyDescription = "Nothing recorded yet. Notes are private to you.",
}: NotesSectionProps) {
  const [notes, setNotes] = useState<NoteRecord[] | null>(null)
  const [body, setBody] = useState("")
  const [targetValue, setTargetValue] = useState(defaultTarget.value)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState("")
  const composerRef = useRef<HTMLTextAreaElement>(null)

  // A single-target section (session or questionnaire page) lists only its own
  // notes; the patient page passes the patient target and lists everything.
  const scoped = targets.length === 1

  useEffect(() => {
    const query = new URLSearchParams({ patientId })
    if (scoped) {
      if (defaultTarget.questionnaireId) {
        query.set("questionnaireId", defaultTarget.questionnaireId)
      } else if (defaultTarget.sessionId) {
        query.set("sessionId", defaultTarget.sessionId)
      }
    }

    let active = true
    fetch(`/api/notes?${query}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((data: NoteRecord[]) => {
        if (active) setNotes(data)
      })
      .catch(() => {
        if (active) {
          setNotes([])
          setError("Couldn't load notes.")
        }
      })
    return () => {
      active = false
    }
  }, [patientId, scoped, defaultTarget.sessionId, defaultTarget.questionnaireId])

  const activeTarget =
    targets.find((t) => t.value === targetValue) ?? defaultTarget

  async function onSave() {
    const trimmed = body.trim()
    if (!trimmed) return

    setSaving(true)
    setError(null)
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        sessionId: activeTarget.sessionId,
        questionnaireId: activeTarget.questionnaireId,
        body: trimmed,
      }),
    })
    setSaving(false)

    if (!res.ok) {
      setError("Couldn't save that note. Try again.")
      return
    }

    const created: NoteRecord = await res.json()
    setNotes((prev) => [created, ...(prev ?? [])])
    setBody("")
    setTargetValue(defaultTarget.value)
    toast.success("Note saved")
    composerRef.current?.focus()
  }

  async function onUpdate(id: string) {
    const trimmed = editingBody.trim()
    if (!trimmed) return

    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    })

    if (!res.ok) {
      toast.error("Couldn't update that note.")
      return
    }

    const updated: NoteRecord = await res.json()
    setNotes((prev) => (prev ?? []).map((n) => (n.id === id ? updated : n)))
    setEditingId(null)
    toast.success("Note updated")
  }

  async function onDelete(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Couldn't delete that note.")
      return
    }
    setNotes((prev) => (prev ?? []).filter((n) => n.id !== id))
    toast.success("Note deleted")
  }

  return (
    <Card className="overflow-hidden py-0 shadow-sm">
      <CardHeader className="border-b px-4 py-4 md:px-6">
        <SectionHeader title={title} />
      </CardHeader>

      <CardContent className="space-y-4 p-4 md:p-6">
        <div className="space-y-2">
          <Label htmlFor="note-body" className="sr-only">
            New note
          </Label>
          <Textarea
            id="note-body"
            ref={composerRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a note…"
            rows={3}
            className="resize-y"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {targets.length > 1 ? (
              <div className="flex min-w-0 items-center gap-2">
                <Label
                  htmlFor="note-target"
                  className="shrink-0 text-xs text-muted-foreground"
                >
                  Attach to
                </Label>
                <Select value={targetValue} onValueChange={setTargetValue}>
                  <SelectTrigger id="note-target" className="min-w-0 sm:w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {targets.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Attached to {activeTarget.label}
              </p>
            )}

            <Button
              onClick={onSave}
              disabled={!body.trim() || saving}
              size="sm"
              className="min-h-11 sm:min-h-0"
            >
              {saving ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>

        {error && <FormErrorAlert message={error} />}

        {notes === null ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState plain title="No notes yet" description={emptyDescription} />
        ) : (
          <ul className="divide-y border-t">
            {notes.map((note) => (
              <li key={note.id} className="py-4 first:pt-4 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-normal">
                    {noteAttachmentLabel(note)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(note.createdAt)}
                    {note.updatedAt !== note.createdAt && " · edited"}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    {editingId === note.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cancel editing"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit note"
                        onClick={() => {
                          setEditingId(note.id)
                          setEditingBody(note.body)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete note"
                      onClick={() => onDelete(note.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {editingId === note.id ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      rows={3}
                      className="resize-y"
                      aria-label="Edit note"
                    />
                    <Button
                      size="sm"
                      onClick={() => onUpdate(note.id)}
                      disabled={!editingBody.trim()}
                    >
                      Save changes
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-foreground">
                    {note.body}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
