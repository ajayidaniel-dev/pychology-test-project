"use client"

import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <Button
      size="sm"
      className="print-hidden gap-1.5"
      onClick={() => window.print()}
    >
      <Printer className="size-4" aria-hidden />
      Print / Save as PDF
    </Button>
  )
}
