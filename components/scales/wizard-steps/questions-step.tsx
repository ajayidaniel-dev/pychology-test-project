import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export type ItemType = "MULTIPLE_CHOICE" | "YES_NO" | "FREE_TEXT" | "NUMBER"

export interface Option {
  label: string
  value: string
}

export interface DraftItem {
  text: string
  type: ItemType
  options: Option[]
}

interface QuestionsStepProps {
  items: DraftItem[]
  itemText: string
  itemType: ItemType
  options: Option[]
  itemsError?: string
  onItemTextChange: (v: string) => void
  onItemTypeChange: (v: ItemType) => void
  onAddItem: () => void
  onRemoveItem: (i: number) => void
  onAddOption: () => void
  onRemoveOption: (i: number) => void
  onUpdateOption: (i: number, field: "label" | "value", val: string) => void
}

export function QuestionsStep({
  items,
  itemText,
  itemType,
  options,
  itemsError,
  onItemTextChange,
  onItemTypeChange,
  onAddItem,
  onRemoveItem,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
}: QuestionsStepProps) {
  return (
    <div className="space-y-4">
      {itemsError && (
        <p className="text-sm text-destructive">{itemsError}</p>
      )}

      {items.length > 0 && (
        <Card className="overflow-hidden py-0 shadow-sm">
          <CardHeader className="border-b px-4 py-4">
            <CardTitle className="text-base">
              Added questions ({items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 w-5 shrink-0 text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{item.text}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {item.type.replace(/_/g, " ").toLowerCase()}
                    {item.options.length
                      ? ` · ${item.options.length} options`
                      : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveItem(i)}
                  aria-label="Remove question"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Add question</CardTitle>
          <CardDescription>
            Build your questionnaire one question at a time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Question text</Label>
            <Input
              value={itemText}
              onChange={(e) => onItemTextChange(e.target.value)}
              placeholder="e.g. How often have you felt anxious?"
            />
          </div>
          <div className="space-y-1">
            <Label>Response type</Label>
            <Select
              value={itemType}
              onValueChange={(v) => onItemTypeChange(v as ItemType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MULTIPLE_CHOICE">Multiple Choice</SelectItem>
                <SelectItem value="YES_NO">Yes / No</SelectItem>
                <SelectItem value="FREE_TEXT">Free Text</SelectItem>
                <SelectItem value="NUMBER">Number</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {itemType === "MULTIPLE_CHOICE" && (
            <div className="space-y-2">
              <Label>Answer options</Label>
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder={`Option ${i + 1} label`}
                    value={opt.label}
                    onChange={(e) =>
                      onUpdateOption(i, "label", e.target.value)
                    }
                  />
                  <Input
                    className="w-20"
                    placeholder="Value"
                    type="number"
                    value={opt.value}
                    onChange={(e) =>
                      onUpdateOption(i, "value", e.target.value)
                    }
                  />
                  {options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => onRemoveOption(i)}
                      aria-label="Remove option"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onAddOption}
              >
                + Add option
              </Button>
            </div>
          )}

          <Button
            type="button"
            onClick={onAddItem}
            disabled={!itemText.trim()}
            size="sm"
            variant="outline"
            className="gap-1"
          >
            <Plus className="size-4" />
            Add question
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
