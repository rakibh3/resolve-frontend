import { Suspense } from "react"
import type { Metadata } from "next"

import { RouteTransition, Streamed } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"
import type { RecallSheetQuery } from "@/lib/api/recall"
import type { Difficulty, PracticeState } from "@/lib/api/types"

import { RecallSheet } from "./_components/recall-sheet"
import { SheetFiltersSlot } from "./_components/sheet-filters-slot"

export const metadata: Metadata = {
  title: "Recall",
}

const DIFFICULTIES = new Set<Difficulty>(["EASY", "MEDIUM", "HARD", "UNRATED"])
const STATUSES = new Set<PracticeState>([
  "SCHEDULED",
  "DUE",
  "OVERDUE",
  "MASTERED",
  "NEEDS_REINFORCEMENT",
])

const FILTER_PARAMS = ["pattern", "topic", "difficulty", "status"] as const

type RawParams = Record<string, string | string[] | undefined>

function one(params: RawParams, key: string): string | undefined {
  const value = params[key]
  const single = Array.isArray(value) ? value[0] : value
  return single && single.length > 0 ? single : undefined
}

/**
 * `pattern` and `topic` are lists here; `difficulty` and `status` are single
 * values — unlike the library listing, where the last two are lists too. An
 * unrecognized enum value is dropped rather than forwarded, so a hand-edited
 * URL degrades to a wider result instead of a 400.
 */
function buildQuery(params: RawParams): RecallSheetQuery {
  const pattern = one(params, "pattern")
  const topic = one(params, "topic")
  const difficulty = one(params, "difficulty")
  const status = one(params, "status")

  return {
    pattern: pattern ? pattern.split(",").filter(Boolean) : undefined,
    topic: topic ? topic.split(",").filter(Boolean) : undefined,
    difficulty: DIFFICULTIES.has(difficulty as Difficulty)
      ? (difficulty as Difficulty)
      : undefined,
    status: STATUSES.has(status as PracticeState)
      ? (status as PracticeState)
      : undefined,
  }
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-xl" />
      ))}
    </div>
  )
}

export default async function RecallPage({
  searchParams,
}: PageProps<"/recall">) {
  const params = (await searchParams) as RawParams
  const query = buildQuery(params)
  const hasFilters = FILTER_PARAMS.some((key) => one(params, key))

  return (
    <RouteTransition>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Recall sheet
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Everything you have written up, grouped by technique rather than by
            problem — the pre-interview skim. A problem tagged with several
            patterns appears under each of them.
          </p>
        </div>

        {/* Every useSearchParams() consumer sits inside a Suspense boundary, or
            the whole route bails out to client-side rendering. */}
        <Suspense fallback={<Skeleton className="h-8 w-80 max-w-full" />}>
          <SheetFiltersSlot />
        </Suspense>

        <Streamed fallback={<SheetSkeleton />}>
          <RecallSheet query={query} hasFilters={hasFilters} />
        </Streamed>
      </div>
    </RouteTransition>
  )
}
