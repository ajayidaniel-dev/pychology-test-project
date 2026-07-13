"use client"

import { useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { OptionCard } from "@/components/questionnaire/option-card"

export interface NormalisedItem {
  number: number
  text: string
  type: string
  options: { label: string; value: number }[]
}

interface QuestionItemProps {
  item: NormalisedItem
  value: number | string | undefined
  onChange: (value: number | string) => void
  autofocus?: boolean
}

export function QuestionItem({
  item,
  value,
  onChange,
  autofocus = false,
}: QuestionItemProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!autofocus) return
    if (item.type === "NUMBER") {
      inputRef.current?.focus()
    } else if (item.type === "FREE_TEXT") {
      textareaRef.current?.focus()
    }
  }, [autofocus, item.type, item.number])

  return (
    <Card className="border shadow-sm">
      <CardContent className="space-y-4 pt-6">
        <p className="text-base font-medium leading-snug">
          <span className="text-muted-foreground">{item.number}.</span>{" "}
          {item.text}
        </p>

        {(item.type === "MULTIPLE_CHOICE" || item.type === "YES_NO") && (
          <div
            role="radiogroup"
            aria-label={`Question ${item.number}`}
            className="space-y-2"
          >
            {item.options.map((opt) => (
              <OptionCard
                key={opt.value}
                id={`item-${item.number}-${opt.value}`}
                label={opt.label}
                selected={value === opt.value}
                onSelect={() => onChange(opt.value)}
              />
            ))}
          </div>
        )}

        {item.type === "NUMBER" && (
          <Input
            ref={inputRef}
            type="number"
            className="w-full"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Answer for question ${item.number}`}
          />
        )}

        {item.type === "FREE_TEXT" && (
          <Textarea
            ref={textareaRef}
            rows={4}
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            aria-label={`Answer for question ${item.number}`}
          />
        )}
      </CardContent>
    </Card>
  )
}
