import { Suspense } from "react"
import type { Metadata } from "next"

import { RouteTransition, Streamed } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"
import { getSettings } from "@/lib/api/settings"
import type { InsightsRange } from "@/lib/api/insights"

import { ActivityCard } from "./_components/activity-card"
import { BacklogCard } from "./_components/backlog-card"
import { CardBoundary } from "./_components/card-boundary"
import { InsightCardSkeleton } from "./_components/insight-card"
import { RangePicker } from "./_components/range-picker"
import { SummaryCard } from "./_components/summary-card"
import { WeakPatternsCard } from "./_components/weak-patterns-card"
import { WeakTopicsCard } from "./_components/weak-topics-card"

export const metadata: Metadata = {
  title: "Insights",
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function readRange(params: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => {
    const value = params[key]
    const single = Array.isArray(value) ? value[0] : value
    return single && DATE_PATTERN.test(single) ? single : undefined
  }
  return { from: pick("from"), to: pick("to") } satisfies InsightsRange
}

export default async function InsightsPage({
  searchParams,
}: PageProps<"/insights">) {
  const params = await searchParams
  const range = readRange(params as Record<string, string | string[] | undefined>)

  // A key derived from the range remounts each card when it changes, which
  // gives the charts a fresh reveal instead of a snap.
  const rangeKey = `${range.from ?? ""}:${range.to ?? ""}`

  return (
    <RouteTransition>
      <div className="flex flex-col gap-6">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Insights
        </h1>

        <Suspense fallback={<Skeleton className="h-[168px] rounded-xl" />}>
          <RangePickerSlot />
        </Suspense>

        {/* Five independent boundaries: all five requests start in parallel and
            each card paints as its own data lands. */}
        <CardBoundary title="Summary">
          <Streamed fallback={<InsightCardSkeleton height={300} />}>
            <SummaryCard key={rangeKey} range={range} />
          </Streamed>
        </CardBoundary>

        <CardBoundary title="Activity">
          <Streamed fallback={<InsightCardSkeleton height={220} />}>
            <ActivityCard key={rangeKey} range={range} />
          </Streamed>
        </CardBoundary>

        <CardBoundary title="Backlog">
          <Streamed fallback={<InsightCardSkeleton height={360} />}>
            <BacklogCard key={rangeKey} range={range} />
          </Streamed>
        </CardBoundary>

        <CardBoundary title="Weak topics">
          <Streamed fallback={<InsightCardSkeleton height={280} />}>
            <WeakTopicsCard />
          </Streamed>
        </CardBoundary>

        <CardBoundary title="Weak patterns">
          <Streamed fallback={<InsightCardSkeleton height={280} />}>
            <WeakPatternsCard />
          </Streamed>
        </CardBoundary>
      </div>
    </RouteTransition>
  )
}

/** The picker needs the owner's timezone to know what "today" means. */
async function RangePickerSlot() {
  const settings = await getSettings().catch(() => null)
  return <RangePicker timezone={settings?.timezone ?? "UTC"} />
}
