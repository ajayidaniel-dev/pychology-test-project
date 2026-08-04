"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { Specialty } from "@prisma/client"
import { SPECIALTY_LABELS } from "@/lib/specialties"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type AreaView = {
  id: string
  name: string
  specialty: Specialty | null
  description: string | null
  memberCount: number
  patientCount: number
}

export function AreasTable({ areas }: { areas: AreaView[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Specialty</TableHead>
          <TableHead className="text-right">Members</TableHead>
          <TableHead className="text-right">Patients</TableHead>
          <TableHead className="w-[1%]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {areas.map((area) => (
          <TableRow key={area.id}>
            <TableCell className="font-medium">{area.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {area.specialty ? SPECIALTY_LABELS[area.specialty] : "—"}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {area.memberCount}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">
              {area.patientCount}
            </TableCell>
            <TableCell>
              <DeleteAreaButton
                areaId={area.id}
                name={area.name}
                patientCount={area.patientCount}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DeleteAreaButton({
  areaId,
  name,
  patientCount,
}: {
  areaId: string
  name: string
  patientCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const blocked = patientCount > 0

  async function confirm(event: React.MouseEvent) {
    if (blocked) return
    event.preventDefault()
    setPending(true)
    const res = await fetch(`/api/areas/${areaId}`, { method: "DELETE" })
    const body = await res.json().catch(() => ({}))
    setPending(false)
    if (!res.ok) {
      toast.error(body.error ?? "Could not delete area")
      return
    }
    toast.success(`Deleted ${name}`)
    setOpen(false)
    router.refresh()
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending}>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `This area still has ${patientCount} patient${patientCount === 1 ? "" : "s"}. Move them first.`
              : "Members will lose this area assignment. Patients are already clear of it."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction onClick={confirm} disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete area"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
