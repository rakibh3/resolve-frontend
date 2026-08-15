import { Skeleton } from "@/components/ui/skeleton"

export default function SearchLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-24 rounded-xl" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}
