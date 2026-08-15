import { Suspense } from "react"
import type { Metadata } from "next"

import { RouteTransition, Streamed } from "@/components/motion/streamed"
import type {
  Difficulty,
  PracticeState,
  ProblemSource,
} from "@/lib/api/types"
import type { ProblemListQuery, ProblemSortBy, SortOrder } from "@/lib/api/problems"

import { FilterProvider } from "./_components/filter-provider"
import { LibraryResults } from "./_components/library-results"
import {
  FilterBarSkeleton,
  LibrarySkeleton,
} from "./_components/library-skeleton"
import { FilterSlot } from "./_components/filter-slot"
import { SortControl } from "./_components/sort-control"

export const metadata: Metadata = {
  title: "Library",
}

const PAGE_SIZE = 20

const DIFFICULTIES = new Set<Difficulty>([
  "EASY",
  "MEDIUM",
  "HARD",
  "UNRATED",
])
const STATUSES = new Set<PracticeState>([
  "SCHEDULED",
  "DUE",
  "OVERDUE",
  "MASTERED",
  "NEEDS_REINFORCEMENT",
])
const SORT_FIELDS = new Set<ProblemSortBy>([
  "createdAt",
  "title",
  "difficulty",
  "nextDueAt",
])

type RawParams = Record<string, string | string[] | undefined>

function one(params: RawParams, key: string): string | undefined {
  const value = params[key]
  const single = Array.isArray(value) ? value[0] : value
  return single && single.length > 0 ? single : undefined
}

/** Splits a CSV param and keeps only values the backend's enum accepts. */
function csv<T extends string>(
  params: RawParams,
  key: string,
  allowed: Set<T>,
): T[] | undefined {
  const raw = one(params, key)
  if (!raw) return undefined
  const values = raw.split(",").filter((value): value is T => allowed.has(value as T))
  return values.length > 0 ? values : undefined
}

/**
 * The backend wants the string literals `"true"` / `"false"`; the client
 * serializer turns a boolean back into exactly those, so anything else in the
 * URL becomes "no filter" rather than a 400.
 */
function tristate(raw: string | undefined): boolean | undefined {
  if (raw === "true") return true
  if (raw === "false") return false
  return undefined
}

function buildQuery(params: RawParams): ProblemListQuery {
  const source = one(params, "source")
  const sortBy = one(params, "sortBy")
  const sortOrder = one(params, "sortOrder")
  const topic = one(params, "topic")
  const pattern = one(params, "pattern")
  const page = Number(one(params, "page") ?? 1)

  return {
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    limit: PAGE_SIZE,
    difficulty: csv(params, "difficulty", DIFFICULTIES),
    status: csv(params, "status", STATUSES),
    source:
      source === "LEETCODE" || source === "CUSTOM"
        ? (source as ProblemSource)
        : undefined,
    topic: topic ? topic.split(",").filter(Boolean) : undefined,
    pattern: pattern ? pattern.split(",").filter(Boolean) : undefined,
    solutionViewed: tristate(one(params, "solutionViewed")),
    hasRecallCard: tristate(one(params, "hasRecallCard")),
    search: one(params, "q"),
    sortBy: sortBy && SORT_FIELDS.has(sortBy as ProblemSortBy)
      ? (sortBy as ProblemSortBy)
      : undefined,
    sortOrder:
      sortOrder === "asc" || sortOrder === "desc"
        ? (sortOrder as SortOrder)
        : undefined,
  }
}

const FILTER_PARAMS = [
  "status",
  "difficulty",
  "topic",
  "pattern",
  "source",
  "solutionViewed",
  "hasRecallCard",
  "q",
] as const

export default async function ProblemsPage({
  searchParams,
}: PageProps<"/problems">) {
  const params = (await searchParams) as RawParams
  const query = buildQuery(params)
  const hasFilters = FILTER_PARAMS.some((key) => one(params, key))

  return (
    <RouteTransition>
      {/* One Suspense boundary around every useSearchParams() consumer, or the
          whole route bails out to client-side rendering. */}
      <Suspense fallback={<FilterBarSkeleton />}>
        <FilterProvider>
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                Library
              </h1>
              <SortControl />
            </div>

            <Suspense fallback={<FilterBarSkeleton />}>
              <FilterSlot />
            </Suspense>

            <Streamed fallback={<LibrarySkeleton />}>
              <LibraryResults query={query} hasFilters={hasFilters} />
            </Streamed>
          </div>
        </FilterProvider>
      </Suspense>
    </RouteTransition>
  )
}
