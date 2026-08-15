import { Suspense } from "react"
import type { Metadata } from "next"

import { UsedOnlyToggle } from "@/components/domain/used-only-toggle"
import { RouteTransition, Streamed } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"

import { PatternList } from "./_components/pattern-list"

export const metadata: Metadata = {
  title: "Patterns",
}

function PatternListSkeleton() {
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

export default async function PatternsPage({
  searchParams,
}: PageProps<"/patterns">) {
  const params = await searchParams
  const usedOnly = params.usedOnly === "true"

  return (
    <RouteTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-extrabold tracking-tight">
              Patterns
            </h1>
            <p className="max-w-prose text-sm text-muted-foreground">
              How you solve things, in your own words. A topic says a problem is
              about arrays; a pattern says you solved it with a monotonic stack.
              Patterns are created by naming one on a recall card.
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-7 w-48 rounded-lg" />}>
            <UsedOnlyToggle noun="patterns" />
          </Suspense>
        </div>

        <Streamed fallback={<PatternListSkeleton />}>
          <PatternList usedOnly={usedOnly} />
        </Streamed>
      </div>
    </RouteTransition>
  )
}
