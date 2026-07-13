import Link from "next/link"
import { Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Verify email",
}

export default function VerifyEmailPage() {
  return (
    <Card className="w-full max-w-md border shadow-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Mail className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to your inbox. Click the link to activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-center text-sm text-muted-foreground">
          The link expires after a limited time. If you don&apos;t see the email, check your spam folder.
        </p>
        <Button className="w-full" asChild>
          <Link href="/auth/signin">Continue to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
