import { Skeleton } from "@/components/ui/skeleton"

export function LibrarySkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-none border-2 border-foreground bg-card shadow-[var(--shadow-neo)]">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b-2 border-foreground px-4 py-3 last:border-b-0"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-none" />
            <Skeleton className="h-5 w-20 rounded-none" />
          </div>
        ))}
      </div>
      <Skeleton className="h-8 w-64 rounded-none" />
    </div>
  )
}

export function FilterBarSkeleton() {
  return <Skeleton className="h-[280px] rounded-none shadow-[var(--shadow-neo)]" />
}
