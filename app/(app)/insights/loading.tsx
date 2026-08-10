import { Skeleton } from "@/components/ui/skeleton"

export default function InsightsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-[168px] rounded-xl" />
      <Skeleton className="h-[300px] rounded-xl" />
      <Skeleton className="h-[220px] rounded-xl" />
      <Skeleton className="h-[360px] rounded-xl" />
      <Skeleton className="h-[280px] rounded-xl" />
    </div>
  )
}
