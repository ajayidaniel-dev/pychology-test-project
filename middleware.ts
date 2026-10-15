import { NextResponse } from "next/server"
import { withAuth } from "next-auth/middleware"
import { PRACTICE_SLUG_HEADER } from "@/lib/practice"

/**
 * Two jobs.
 *
 * 1. Redirect unauthenticated visitors to sign-in with a callbackUrl pointing
 *    back at the page they asked for, so deep links (e.g. alert emails) survive
 *    the login step. The (dashboard) layout's own check remains as a backstop.
 *
 * 2. Lift the practice slug out of `/p/<slug>/…` into a request header.
 *    Server components cannot read the pathname directly, and threading a param
 *    through every page and helper would mean every data access needing to be
 *    told which practice it is in. The header lets `getPracticeContext()` read
 *    it in one place instead.
 *
 * The header is *stripped from incoming requests* before being set. Without
 * that, a client could send `x-practice-slug` itself and name a practice the
 * URL never mentioned. It is only trusted because this is the only writer —
 * and the membership lookup still has to succeed regardless.
 */
const PRACTICE_PATH = /^\/p\/([^/]+)/

/**
 * Routes that existed before practices did. Bookmarks, notification emails and
 * anything already shared point at these, so they forward rather than 404.
 * Choosing *which* practice needs a database lookup, which middleware cannot
 * do — `/practice-redirect` resolves it.
 */
const LEGACY_PREFIXES = ["/dashboard", "/patients", "/batches", "/scales"]

export default withAuth(
  function middleware(req) {
    const { pathname, search } = req.nextUrl

    if (
      LEGACY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    ) {
      const url = req.nextUrl.clone()
      url.pathname = "/practice-redirect"
      url.search = ""
      url.searchParams.set("to", `${pathname}${search}`)
      return NextResponse.redirect(url)
    }

    const headers = new Headers(req.headers)
    headers.delete(PRACTICE_SLUG_HEADER)

    const match = pathname.match(PRACTICE_PATH)
    if (match) headers.set(PRACTICE_SLUG_HEADER, decodeURIComponent(match[1]))

    return NextResponse.next({ request: { headers } })
  },
  { pages: { signIn: "/auth/signin" } },
)

export const config = {
  matcher: [
    "/p/:path*",
    "/account",
    "/account/:path*",
    "/settings",
    "/settings/:path*",
    // Both resolve a practice and so require a session. Handling the
    // unauthenticated case here gives a clean 307; leaving it to the page
    // means the redirect is issued mid-stream and degrades to a one-second
    // meta-refresh in the browser.
    "/practice-redirect",
    "/no-practice",
    "/onboarding",
    // Kept so old links and bookmarks still authenticate before the
    // (dashboard) layout redirects them onto their practice.
    "/dashboard/:path*",
    "/patients/:path*",
    "/batches/:path*",
    "/scales/:path*",
  ],
}
