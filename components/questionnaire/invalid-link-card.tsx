import { AlertCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function InvalidLinkCard() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-8">
      <Card className="w-full border shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
            <AlertCircle className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>This link is no longer valid</CardTitle>
          <CardDescription>
            The questionnaire link has expired or has already been used.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Contact your clinician for a new link if you still need to complete
            this assessment.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
