import { Skeleton } from "@/components/ui/skeleton"

/**
 * The fallback footprint must match what resolves into it — a crossfade over a
 * shifting layout looks worse than no animation at all. Each block here mirrors
 * the height and spacing of its counterpart in `TodaySection`.
 */
export function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-5 w-56" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-[86px] rounded-xl" />
        <Skeleton className="h-[86px] rounded-xl" />
      </div>

      <Skeleton className="h-[116px] rounded-xl" />

      <div className="flex flex-col gap-3">
        <Skeleton className="h-7 w-48" />
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-[168px] rounded-xl" />
          <Skeleton className="h-[168px] rounded-xl" />
          <Skeleton className="h-[168px] rounded-xl" />
          <Skeleton className="h-[168px] rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  )
}
