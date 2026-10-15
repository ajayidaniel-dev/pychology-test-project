import Link from "next/link"
import type { PracticeStatus } from "@prisma/client"
import { AlertTriangle } from "lucide-react"
import { can } from "@/lib/roles"
import type { MembershipRole } from "@prisma/client"
import { Button } from "@/components/ui/button"

export function VerificationBanner({
  status,
  role,
  settingsHref,
}: {
  status: PracticeStatus
  role: MembershipRole
  settingsHref: string
}) {
  if (status !== "PENDING_VERIFICATION" && status !== "SUSPENDED") return null

  const canFix = can(role, "managePracticeSettings")

  if (status === "SUSPENDED") {
    return (
      <div
        role="status"
        className="mb-4 flex flex-col gap-2 rounded-xl border border-severity-foreground/20 bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p>
            This practice is suspended. Clinical writes and invites are blocked.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-2 rounded-xl border border-dashed px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p>
          Practice pending verification. Complete registration details before
          creating patients or inviting staff.
        </p>
      </div>
      {canFix && (
        <Button asChild size="sm" variant="outline" className="shrink-0 self-start">
          <Link href={settingsHref}>Finish setup</Link>
        </Button>
      )}
    </div>
  )
}
