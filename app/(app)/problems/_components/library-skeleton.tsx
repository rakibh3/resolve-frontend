import { Skeleton } from "@/components/ui/skeleton"

export function LibrarySkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-4xl" />
            <Skeleton className="h-5 w-20 rounded-4xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-64" />
    </div>
  )
}

export function FilterBarSkeleton() {
  return <Skeleton className="h-[280px] rounded-xl" />
}
