import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"

export const metadata = {
  title: "Choose a new password",
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
