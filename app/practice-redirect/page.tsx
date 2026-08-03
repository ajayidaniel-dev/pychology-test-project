import { redirect } from "next/navigation"
import { getUserContext, listPracticeOptions } from "@/lib/session-context"
import { practicePath } from "@/lib/practice-path"

export const metadata = { title: "Opening…" }

/**
 * Sends a practice-less URL to its practice.
 *
 * Links minted before practices existed — bookmarks, notification emails,
 * anything already out in the world — point at `/patients/123` with no practice
 * in the path. Rather than 404, resolve the user's practice and forward,
 * preserving the rest of the path so a deep link still lands where it meant to.
 *
 * The middleware routes those legacy paths here. This page renders nothing; it
 * exists to do the resolution a middleware cannot, because picking a practice
 * needs a database lookup.
 */
export default async function PracticeRedirectPage({
  searchParams,
}: {
  searchParams: { to?: string }
}) {
  const user = await getUserContext()
  if (!user) redirect("/auth/signin")

  const options = await listPracticeOptions(user.userId)
  if (options.length === 0) redirect("/no-practice")

  // Only ever an internal path. A `to` that is absolute, protocol-relative, or
  // otherwise not a plain path is discarded rather than followed — this is a
  // redirector, and an open one would be a phishing gadget.
  const requested = searchParams.to
  const safe =
    requested && requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard"

  redirect(practicePath(options[0].slug, safe))
}
