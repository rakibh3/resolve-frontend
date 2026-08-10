import Link from "next/link"
import { SproutIcon } from "lucide-react"

import { NullableNumber } from "@/components/motion/animated-number"
import { Badge } from "@/components/ui/badge"
import { getTopicInsights } from "@/lib/api/insights"
import type { TopicInsight } from "@/lib/api/types"

/**
 * Weak topics, worst-first as returned.
 *
 * This endpoint takes no range — it is always all-time — so no range is passed
 * and the card says so, rather than letting the picker above imply otherwise.
 */
export async function WeakTopicsCard() {
  const insights = await getTopicInsights()
  const { thresholds } = insights

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Weak topics
        </h2>
        <p className="text-sm text-muted-foreground">
          Topic insights are always all-time — the date range above does not
          apply to them.
        </p>
        <p className="text-xs text-muted-foreground">
          A topic is flagged weak once it has at least {thresholds.minAttempts}{" "}
          attempts and either an independent solve rate below{" "}
          {thresholds.solveRate}% or an average confidence below{" "}
          {thresholds.confidence}.
        </p>
      </div>

      {insights.weakTopics.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-state-mastered-foreground/20 bg-state-mastered/40 p-4">
          <SproutIcon
            className="mt-0.5 size-4 shrink-0 text-state-mastered-foreground"
            aria-hidden
          />
          <p className="text-sm text-state-mastered-foreground">
            Nothing is flagged weak. Either you are on top of every topic with
            enough attempts to judge, or there is not enough history yet.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {insights.weakTopics.map((topic) => (
            <TopicRow key={topic.id} topic={topic} weak />
          ))}
        </ul>
      )}

      {insights.topics.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground focus-visible:outline-none">
            All {insights.topics.length} topics
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-border">
            {insights.topics.map((topic) => (
              <TopicRow
                key={topic.id}
                topic={topic}
                underSampled={topic.attemptCount < thresholds.minAttempts}
              />
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function TopicRow({
  topic,
  weak = false,
  underSampled = false,
}: {
  topic: TopicInsight
  weak?: boolean
  underSampled?: boolean
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2">
        <Link
          href={`/problems?topic=${topic.slug}`}
          className="truncate text-sm font-medium hover:underline focus-visible:outline-none"
        >
          {topic.name}
        </Link>
        {weak && <Badge className="bg-state-overdue text-state-overdue-foreground">Weak</Badge>}
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
              value={topic.independentSolveRate}
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
              value={topic.averageConfidence}
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
              value={topic.averageMinutes}
              decimals={0}
              emptyLabel="No timing data"
            />{" "}
            min
          </dd>
        </div>
        <div className="hidden gap-1 sm:flex">
          <dt className="sr-only">Attempts</dt>
          <dd>{topic.attemptCount} att.</dd>
        </div>
      </dl>
    </li>
  )
}
