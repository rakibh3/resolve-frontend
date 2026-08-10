import { Skeleton } from "@/components/ui/skeleton"

export default function TopicsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-7 w-44 rounded-lg" />
      </div>
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  )
}
