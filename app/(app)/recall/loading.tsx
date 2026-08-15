import { Skeleton } from "@/components/ui/skeleton"

export default function RecallLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-8 w-80 max-w-full" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-xl" />
      ))}
    </div>
  )
}
