import { Skeleton } from "@/components/ui/skeleton"

export default function BatchDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-8 w-36" />
      </div>

      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
