import { Skeleton } from "@/components/ui/skeleton"

export default function FillLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
      </div>

      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-2 w-full rounded-full" />

      <div className="space-y-3 rounded-lg border p-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-5/6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
