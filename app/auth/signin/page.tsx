import { Suspense } from "react"
import { SignInForm } from "@/components/auth/sign-in-form"

export const metadata = {
  title: "Sign in",
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  )
}
