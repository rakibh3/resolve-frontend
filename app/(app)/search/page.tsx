import { Suspense } from "react"
import Link from "next/link"
import type { Metadata } from "next"
import { LightbulbIcon } from "lucide-react"

import { RouteTransition, Streamed } from "@/components/motion/streamed"
import { Skeleton } from "@/components/ui/skeleton"
import type { SearchQuery } from "@/lib/api/search"
import type { SearchScope } from "@/lib/api/types"
import { isSearchable, LIMITS, searchScopeSchema } from "@/lib/validation"

import { SearchControls } from "./_components/search-controls"
import { SearchResults } from "./_components/search-results"

export const metadata: Metadata = {
  title: "Search",
}

const PAGE_SIZE = 20

type RawParams = Record<string, string | string[] | undefined>

function one(params: RawParams, key: string): string | undefined {
  const value = params[key]
  const single = Array.isArray(value) ? value[0] : value
  return single && single.length > 0 ? single : undefined
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-32 rounded-xl" />
      ))}
    </div>
  )
}

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const params = (await searchParams) as RawParams
  const raw = one(params, "q")
  const scope = searchScopeSchema.safeParse(one(params, "scope"))
  const page = Number(one(params, "page") ?? 1)

  const query: SearchQuery | null = isSearchable(raw)
    ? {
        q: raw.trim(),
        // An unrecognized scope is dropped rather than forwarded — a
        // hand-edited URL should widen the search, not 400 it.
        scope: scope.success ? (scope.data as SearchScope) : undefined,
        page: Number.isFinite(page) && page >= 1 ? page : 1,
        limit: PAGE_SIZE,
      }
    : null

  return (
    <RouteTransition>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-extrabold tracking-tight">
            Search
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Everything you have written — attempt notes, recall cards, problem
            statements, topic and pattern names. The library&rsquo;s own search
            box only matches titles.
          </p>
        </div>

        {/* Every useSearchParams() consumer sits inside a Suspense boundary, or
            the whole route bails out to client-side rendering. */}
        <Suspense fallback={<Skeleton className="h-24 rounded-xl" />}>
          <SearchControls />
        </Suspense>

        {query ? (
          // Keyed on the whole query so a new search gets a fresh fallback
          // rather than holding the previous results on screen.
          <Streamed
            key={`${query.q}:${query.scope ?? ""}:${query.page}`}
            fallback={<ResultsSkeleton />}
          >
            <SearchResults query={query} />
          </Streamed>
        ) : (
          <StartTyping typed={raw?.trim().length ?? 0} />
        )}
      </div>
    </RouteTransition>
  )
}

/**
 * The pre-query state.
 *
 * Below the minimum length the API answers 400, so nothing is requested and
 * this stands in — with the examples that make the difference between this and
 * the library's title search obvious.
 */
function StartTyping({ typed }: { typed: number }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <LightbulbIcon className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {typed === 0
          ? "What are you trying to remember?"
          : `A little more — ${LIMITS.searchQueryMin} characters minimum`}
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        This finds problems by things you wrote months ago and half-remember: a
        phrase from an attempt note, a line from a recall card, the name of a
        technique.
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {["monotonic", "off-by-one", "two pointers", "O(1) space"].map(
          (example) => (
            <li key={example}>
              <Link
                href={`/search?q=${encodeURIComponent(example)}`}
                className="inline-flex h-7 items-center rounded-4xl border border-border px-2.5 text-xs hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {example}
              </Link>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}
