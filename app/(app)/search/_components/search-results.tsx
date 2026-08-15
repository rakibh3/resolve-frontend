import Link from "next/link"
import { SearchXIcon, TriangleAlertIcon } from "lucide-react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { PracticeStateBadge } from "@/components/domain/practice-state-badge"
import { FadeInUp } from "@/components/motion/fade-in-up"
import { buttonVariants } from "@/components/ui/button"
import { ApiError } from "@/lib/api/http"
import { searchLibrary, type SearchQuery } from "@/lib/api/search"
import { getSettings } from "@/lib/api/settings"
import type { SearchField, SearchMatch, SearchResult } from "@/lib/api/types"
import { formatInstant } from "@/lib/date"
import { cn } from "@/lib/utils"

import { Highlight } from "./highlight"
import { SearchPagination } from "./search-pagination"

/**
 * Where each match came from.
 *
 * The order the API ranks by — title, pattern, topic, key insight, approach,
 * pitfalls, statement, attempt note — is preserved as returned. Re-sorting
 * client-side would not reproduce it, because ranking is by field priority
 * rather than by a relevance score.
 */
const FIELD_LABELS: Record<SearchField, string> = {
  title: "Title",
  pattern: "Pattern",
  topic: "Topic",
  keyInsight: "Key insight",
  approach: "Approach",
  pitfalls: "Pitfalls",
  statement: "Statement",
  attemptNote: "Attempt note",
}

export async function SearchResults({ query }: { query: SearchQuery }) {
  let results: SearchResult[]
  let meta

  try {
    const response = await searchLibrary(query)
    results = response.data
    meta = response.meta
  } catch (error) {
    // The page gates on length before calling, so a 400 here means something
    // else in the URL is off — recoverable, and better explained than thrown.
    if (error instanceof ApiError && error.isValidationError) {
      return (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-destructive/40 p-6">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            That search isn&rsquo;t valid
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      )
    }
    throw error
  }

  if (results.length === 0) {
    return <NoResults query={query} />
  }

  // Attempt-note matches are stamped with an instant, which must be rendered
  // against the owner's timezone rather than the browser's.
  const settings = await getSettings().catch(() => null)
  const timezone = settings?.timezone ?? "UTC"

  return (
    <div className="flex flex-col gap-4">
      {meta?.truncated && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/40 px-3 py-2 text-sm text-warning-foreground"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            The scan stopped at its cap, so these are the first matches rather
            than all of them. Narrow the query or pick a scope to see the rest.
          </span>
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {results.map((result, index) => (
          <li key={result.id}>
            <ResultCard
              result={result}
              query={query.q}
              timezone={timezone}
              index={index}
            />
          </li>
        ))}
      </ul>

      {meta ? <SearchPagination meta={meta} /> : null}
    </div>
  )
}

function ResultCard({
  result,
  query,
  timezone,
  index,
}: {
  result: SearchResult
  query: string
  timezone: string
  index: number
}) {
  return (
    <FadeInUp
      index={index}
      className="interactive-press flex flex-col gap-3 rounded-none border-2 border-foreground bg-card p-5 has-focus-visible:outline-2 has-focus-visible:outline-foreground has-focus-visible:outline-offset-2 shadow-[var(--shadow-neo)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/problems/${result.id}`}
          transitionTypes={["nav-forward"]}
          className="font-medium tracking-tight hover:underline focus-visible:outline-none"
        >
          <Highlight text={result.title} query={query} />
        </Link>
        <DifficultyBadge difficulty={result.difficulty} />
        <PracticeStateBadge state={result.practiceState} />
        <span className="text-xs text-muted-foreground">
          {result.source === "LEETCODE" ? "LeetCode" : "Custom"}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {result.matches.map((match, matchIndex) => (
          <MatchRow
            // Field alone is not unique: several attempt notes can match.
            key={`${match.field}-${matchIndex}`}
            match={match}
            query={query}
            timezone={timezone}
          />
        ))}
      </ul>
    </FadeInUp>
  )
}

function MatchRow({
  match,
  query,
  timezone,
}: {
  match: SearchMatch
  query: string
  timezone: string
}) {
  return (
    <li className="flex flex-col gap-0.5 border-l-2 border-border pl-3">
      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {FIELD_LABELS[match.field]}
        {/* Only ever present on attemptNote matches. */}
        {match.attemptedAt && (
          <span className="tabular-nums">
            · {formatInstant(match.attemptedAt, timezone, "d MMM yyyy")}
          </span>
        )}
      </span>
      <p className="text-sm">
        <Highlight text={match.snippet} query={query} />
      </p>
    </li>
  )
}

function NoResults({ query }: { query: SearchQuery }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <SearchXIcon className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Nothing matches “{query.q}”
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        Matching is substring, not fuzzy — there is no stemming and no spelling
        correction, so a shorter fragment finds more. Try{" "}
        <strong className="font-medium text-foreground">
          {query.q.slice(0, Math.max(3, Math.ceil(query.q.length / 2)))}
        </strong>
        {query.scope ? " , or widen the scope back to everything" : ""}.
      </p>
      <div className="flex flex-wrap gap-2">
        {query.scope && (
          <Link
            href={`/search?q=${encodeURIComponent(query.q)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Search everything
          </Link>
        )}
        <Link
          href={`/problems?q=${encodeURIComponent(query.q)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Look in the library instead
        </Link>
      </div>
    </div>
  )
}
