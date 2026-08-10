import { Skeleton } from "@/components/ui/skeleton"

import { TodaySkeleton } from "./_components/today-skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-32" />
      <TodaySkeleton />
    </div>
  )
}
