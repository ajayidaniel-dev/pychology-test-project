"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const url = `${window.location.origin}/fill/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success("Link copied")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={copy}
          className="relative z-20 h-8 gap-1 px-2 text-xs"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy link
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy questionnaire link</TooltipContent>
    </Tooltip>
  )
}
