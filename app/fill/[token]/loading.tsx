import { FillShell } from "@/components/questionnaire/fill-shell"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * FillShell has to be repeated here: the fill layout deliberately doesn't
 * render it (the page personalizes it with the clinician's name), so without
 * it this fallback would paint edge-to-edge with no header and then snap into
 * the real max-w-lg column.
 *
 * The shape mirrors the consent step, which is always what the flow paints
 * first — never the question card.
 */
export default function FillLoading() {
  return (
    <FillShell>
      <div className="space-y-4 py-2">
        <Skeleton className="h-3 w-32" />

        <div className="space-y-5 rounded-xl border p-6 shadow-sm">
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t pt-4">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
      </div>
    </FillShell>
  )
}
