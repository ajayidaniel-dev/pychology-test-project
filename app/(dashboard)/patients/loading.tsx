import { Skeleton } from "@/components/ui/skeleton"

export default function PatientsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 md:hidden" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="hidden space-y-2 md:block">
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  )
}
