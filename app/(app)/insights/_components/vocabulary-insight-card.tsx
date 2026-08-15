import Link from "next/link"
import { SproutIcon } from "lucide-react"

import { NullableNumber } from "@/components/motion/animated-number"
import { Badge } from "@/components/ui/badge"
import type { InsightThresholds, TopicInsight } from "@/lib/api/types"

/**
 * Weak-first performance over one of the two vocabularies.
 *
 * Topics and patterns return the identical shape from two endpoints — same
 * fields, same thresholds — so they share this card. What differs is only the
 * noun, where a row links to, and what an empty result means: a topic with no
 * data means "not enough practice", while no patterns at all means "no recall
 * cards written yet", which is a different problem with a different fix.
 *
 * Neither endpoint takes a date range, so the card says so rather than letting
 * the picker above imply otherwise.
 */
export function VocabularyInsightCard({
  title,
  noun,
  entries,
  weakEntries,
  thresholds,
  hrefFor,
  emptyState,
}: {
  title: string
  /** Plural, lowercase — "topics", "patterns". */
  noun: string
  entries: TopicInsight[]
  weakEntries: TopicInsight[]
  thresholds: InsightThresholds
  hrefFor: (slug: string) => string
  /** Shown when the vocabulary itself is empty, not merely un-flagged. */
  emptyState: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-none border-2 border-foreground bg-card p-5 shadow-[var(--shadow-neo)]">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-bold tracking-tight">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {title} are always all-time — the date range above does not apply to
          them.
        </p>
        <p className="text-xs text-muted-foreground">
          An entry is flagged weak once it has at least {thresholds.minAttempts}{" "}
          attempts and either an independent solve rate below{" "}
          {thresholds.solveRate}% or an average confidence below{" "}
          {thresholds.confidence}.
        </p>
      </div>

      {entries.length === 0 ? (
        emptyState
      ) : weakEntries.length === 0 ? (
        <div className="flex items-start gap-3 rounded-none border-2 border-foreground bg-state-mastered/40 p-5 shadow-[var(--shadow-neo-sm)]">
          <SproutIcon
            className="mt-0.5 size-4 shrink-0 text-state-mastered-foreground"
            aria-hidden
          />
          <p className="text-sm text-state-mastered-foreground">
            Nothing is flagged weak. Either you are on top of every {noun.slice(0, -1)}{" "}
            with enough attempts to judge, or there is not enough history yet.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {weakEntries.map((entry) => (
            <InsightRow
              key={entry.id}
              entry={entry}
              href={hrefFor(entry.slug)}
              weak
            />
          ))}
        </ul>
      )}

      {entries.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground focus-visible:outline-none">
            All {entries.length} {noun}
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <InsightRow
                key={entry.id}
                entry={entry}
                href={hrefFor(entry.slug)}
                underSampled={entry.attemptCount < thresholds.minAttempts}
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function InsightRow({
  entry,
  href,
  weak = false,
  underSampled = false,
}: {
  entry: TopicInsight
  href: string
  weak?: boolean
  underSampled?: boolean
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={href}
          className="truncate text-sm font-medium hover:underline focus-visible:outline-none"
        >
          {entry.name}
        </Link>
        {weak && (
          <Badge className="bg-state-overdue text-state-overdue-foreground">
            Weak
          </Badge>
        )}
        {underSampled && (
          <Badge variant="ghost" title="Not enough attempts to judge yet">
            Under-sampled
          </Badge>
        )}
      </div>

      <dl className="flex items-center gap-4 text-xs text-muted-foreground tabular-nums">
        <div className="flex gap-1">
          <dt className="sr-only">Independent solve rate</dt>
          {/* Already a percentage 0–100 — never multiplied again. */}
          <dd>
            <NullableNumber
              value={entry.independentSolveRate}
              decimals={0}
              suffix="%"
              emptyLabel="No attempts"
            />{" "}
            solved
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Average confidence</dt>
          <dd>
            <NullableNumber
              value={entry.averageConfidence}
              decimals={1}
              emptyLabel="No confidence data"
            />{" "}
            conf.
          </dd>
        </div>
        <div className="flex gap-1">
          <dt className="sr-only">Average minutes</dt>
          <dd>
            <NullableNumber
              value={entry.averageMinutes}
              decimals={0}
              emptyLabel="No timing data"
            />{" "}
            min
          </dd>
        </div>
        <div className="hidden gap-1 sm:flex">
          <dt className="sr-only">Attempts</dt>
          <dd>{entry.attemptCount} att.</dd>
        </div>
      </dl>
    </li>
  )
}
