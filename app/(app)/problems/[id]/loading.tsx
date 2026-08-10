import { Skeleton } from "@/components/ui/skeleton"

export default function ProblemLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-44 rounded-4xl" />
          <Skeleton className="h-5 w-56 rounded-4xl" />
        </div>
        <Skeleton className="h-7 w-48 rounded-lg" />
      </div>

      <Skeleton className="h-[160px] rounded-xl" />
      <Skeleton className="h-[380px] rounded-xl" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[240px] rounded-xl" />
        <Skeleton className="h-[240px] rounded-xl" />
      </div>
    </div>
  )
}
