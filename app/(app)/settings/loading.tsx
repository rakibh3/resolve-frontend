import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-[480px] rounded-xl" />
      <Skeleton className="h-[440px] rounded-xl" />
    </div>
  )
}
