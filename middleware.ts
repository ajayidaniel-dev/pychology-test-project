import { withAuth } from "next-auth/middleware"

// Redirects unauthenticated visitors to the sign-in page with a callbackUrl
// pointing back at the page they asked for, so deep links (e.g. alert emails)
// survive the login step. The (dashboard) layout's getServerSession check
// remains as a backstop.
export default withAuth({
  pages: { signIn: "/auth/signin" },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/patients/:path*",
    "/batches/:path*",
    "/scales/:path*",
    "/settings/:path*",
  ],
}
