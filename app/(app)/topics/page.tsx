import { Suspense } from "react"
import type { Metadata } from "next"

import { UsedOnlyToggle } from "@/components/domain/used-only-toggle"
import { RouteTransition, Streamed } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"

import { TopicList } from "./_components/topic-list"

export const metadata: Metadata = {
  title: "Topics",
}

function TopicListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-5 flex-1" />
          <Skeleton className="h-5 w-24 rounded-4xl" />
          <Skeleton className="size-6 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export default async function TopicsPage({
  searchParams,
}: PageProps<"/topics">) {
  const params = await searchParams
  const usedOnly = params.usedOnly === "true"

  return (
    <RouteTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Topics
            </h1>
            <p className="text-sm text-muted-foreground">
              A shared vocabulary, created by tagging problems.
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-7 w-44 rounded-lg" />}>
            <UsedOnlyToggle noun="topics" />
          </Suspense>
        </div>

        <Streamed fallback={<TopicListSkeleton />}>
          <TopicList usedOnly={usedOnly} />
        </Streamed>
      </div>
    </RouteTransition>
  )
}
