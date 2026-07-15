import { Suspense } from "react"
import { SignInForm } from "@/components/auth/sign-in-form"
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton"

export const metadata = {
  title: "Sign in",
}

export default function SigninPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <SignInForm />
    </Suspense>
  )
}
