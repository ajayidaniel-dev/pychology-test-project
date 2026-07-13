import { Skeleton } from "@/components/ui/skeleton"

export default function SessionDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-36" />
      </div>

      <Skeleton className="h-32 rounded-xl" />

      <div className="space-y-2 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="hidden space-y-2 md:block">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>

      <Skeleton className="h-48 rounded-xl" />
    </div>
  )
}
