import Link from "next/link"
import { MailCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"

export const metadata = {
  title: "Verify email",
}

export default function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md gap-5 shadow-sm">
      <CardHeader className="gap-1.5">
        <h1
          data-slot="card-title"
          className="text-2xl leading-none font-semibold tracking-tight text-balance"
        >
          Check your email
        </h1>
        <CardDescription className="text-pretty">
          We sent a verification link to your inbox. Open it to activate your
          account.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
          <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium">The link expires after a limited time.</p>
            <p className="text-muted-foreground">
              Not there? Check your spam folder. You can request another from the
              sign-in screen.
            </p>
          </div>
        </div>

        <Button className="w-full" asChild>
          <Link href="/auth/signin">Continue to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
