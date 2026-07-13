"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  patientId: string
  currentDisplayName: string
}

export function PatientActions({ patientId, currentDisplayName }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function saveEdit() {
    if (!displayName.trim()) return
    setSaving(true)
    const res = await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: displayName.trim() }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Patient updated")
      setEditing(false)
      router.refresh()
    }
  }

  async function deletePatient() {
    setDeleting(true)
    const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Patient deleted")
      router.push("/patients")
      router.refresh()
    } else {
      setDeleting(false)
    }
  }

  if (editing) {
    return (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <Input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="h-9 w-full text-sm sm:w-48"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit()
            if (e.key === "Escape") {
              setEditing(false)
              setDisplayName(currentDisplayName)
            }
          }}
        />
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={saveEdit}
            disabled={saving || !displayName.trim()}
            className="h-9 px-2"
          >
            {saving ? "…" : <Check className="size-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false)
              setDisplayName(currentDisplayName)
            }}
            className="h-9 px-2"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop inline actions */}
      <div className="hidden items-center gap-1 sm:flex">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(true)}
          className="h-8 px-2 text-muted-foreground"
          title="Edit display name"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
          className="h-8 px-2 text-muted-foreground hover:text-destructive"
          title="Delete patient"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {/* Mobile dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="size-9 sm:hidden"
            aria-label="Patient actions"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Edit name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            Delete patient
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this patient and all their assessment
              sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deletePatient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete patient"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
