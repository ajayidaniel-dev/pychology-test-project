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
import { cn } from "@/lib/utils"

export function CopyLinkButton({
  token,
  iconOnly = false,
  className,
}: {
  token: string
  /** Icon-only variant for narrow table action cells. */
  iconOnly?: boolean
  className?: string
}) {
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
          aria-label={copied ? "Link copied" : "Copy questionnaire link"}
          className={cn(
            iconOnly
              ? "relative z-20 size-8 p-0"
              : "relative z-20 h-8 gap-1 px-2 text-xs",
            className,
          )}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              {!iconOnly && "Copied"}
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              {!iconOnly && "Copy link"}
            </>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy questionnaire link</TooltipContent>
    </Tooltip>
  )
}
