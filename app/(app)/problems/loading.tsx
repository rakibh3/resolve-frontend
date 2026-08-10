import { Skeleton } from "@/components/ui/skeleton"

import {
  FilterBarSkeleton,
  LibrarySkeleton,
} from "./_components/library-skeleton"

export default function ProblemsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-7 w-32 rounded-lg" />
      </div>
      <FilterBarSkeleton />
      <LibrarySkeleton />
    </div>
  )
}
