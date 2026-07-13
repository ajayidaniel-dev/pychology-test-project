import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface BasicInfoStepProps {
  name: string
  description: string
  onNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  nameError?: string
}

export function BasicInfoStep({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  nameError,
}: BasicInfoStepProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Basic Info</CardTitle>
        <CardDescription>Name and describe your custom scale.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="scale-name">Scale name</Label>
          <Input
            id="scale-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Weekly Mood Check"
          />
          {nameError && (
            <p className="text-sm text-destructive">{nameError}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="scale-description">
            Description{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="scale-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Brief description of this scale"
          />
        </div>
      </CardContent>
    </Card>
  )
}
