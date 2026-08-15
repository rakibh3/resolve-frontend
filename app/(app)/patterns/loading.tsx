import { Skeleton } from "@/components/ui/skeleton"

export default function PatternsLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-7 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-[420px] rounded-xl" />
    </div>
  )
}
