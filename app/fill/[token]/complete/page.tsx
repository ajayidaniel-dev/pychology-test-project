import type { Metadata } from "next"
import { CheckCircle2 } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Thank You",
  robots: "noindex",
}

const NEXT_STEPS = [
  "Your responses have been submitted securely",
  "Your clinician will review your results",
  "You can close this window",
] as const

export default function CompletePage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-8">
      <Card className="w-full border shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="size-7 text-primary" />
          </div>
          <CardTitle>Thank you</CardTitle>
          <CardDescription>
            Your questionnaire has been submitted successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">What happens next</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {NEXT_STEPS.map((step) => (
                <li key={step} className="flex gap-2">
                  <span className="text-primary" aria-hidden>
                    •
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
