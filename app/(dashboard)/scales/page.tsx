import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"

export const metadata: Metadata = {
  title: "Scales",
}
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ScaleListSection } from "@/components/scales/scale-list-section"
import { Plus } from "lucide-react"

export default async function ScalesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/auth/signin")

  const [libraryScales, myScales] = await Promise.all([
    prisma.scale.findMany({
      where: { isLibrary: true },
      include: { _count: { select: { items: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.scale.findMany({
      where: { psychologistId: session.user.id, isLibrary: false },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scales"
        description="Validated library instruments and your custom questionnaires"
        hideTitleOnMobile
        actions={
          <Button asChild>
            <Link href="/scales/new">
              <Plus className="size-4" />
              New Scale
            </Link>
          </Button>
        }
      />

      <ScaleListSection libraryScales={libraryScales} myScales={myScales} />
    </div>
  )
}
