import Link from "next/link"

import {
  AnimatedNumber,
  NullableNumber,
} from "@/components/motion/animated-number"
import { ProgressRing } from "@/components/motion/progress-ring"
import { getInsightsSummary, type InsightsRange } from "@/lib/api/insights"
import type { InsightsSummary } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export async function SummaryCard({ range }: { range: InsightsRange }) {
  const summary = await getInsightsSummary(range)
  const { revisionCompletion: completion, averageSolveTime: solve } = summary

  return (
    <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-4">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        Summary
      </h2>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Problems added" value={summary.problemsAdded} />
        <Metric label="Problems attempted" value={summary.problemsAttempted} />
        <Metric label="Solved independently" value={summary.solvedIndependently} />
        <Metric
          label="Mastered"
          value={summary.mastered}
          // Not a figure for the selected range — the backend counts problems
          // whose stored practiceState is MASTERED right now.
          hint="Current total, all time"
        />
      </dl>

      {/* Ring and label anchor the left, the fraction the right, so the row
          uses the card's full width instead of trailing off into space. */}
      <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
        <ProgressRing
          // null means nothing has come due yet — not a rate of zero.
          value={completion.rate === null ? null : completion.rate / 100}
          size={88}
          label={
            completion.rate === null
              ? "Revision completion: no revisions have come due yet"
              : `Revision completion: ${completion.rate}%`
          }
        >
          <span className="font-heading text-lg font-semibold tracking-tight">
            <AnimatedNumber
              value={completion.rate ?? 0}
              decimals={0}
              suffix="%"
            />
          </span>
        </ProgressRing>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Revisions completed on time</span>
          {completion.rate === null ? (
            <p className="text-sm text-muted-foreground">
              No revisions have come due yet.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground tabular-nums">
              {completion.completedOnTime.toLocaleString()} of{" "}
              {completion.dueTotal.toLocaleString()} due
            </p>
          )}
        </div>
        </div>

        {completion.rate !== null && (
          <div className="flex flex-col gap-0.5 sm:ml-auto sm:text-right">
            <span className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
              {completion.completedOnTime.toLocaleString()}
              <span className="text-muted-foreground">
                {" / "}
                {completion.dueTotal.toLocaleString()}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              Revisions due in range
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-start sm:justify-between">
        <SolveTime
          label="First attempts"
          averageMinutes={solve.firstAttempt.averageMinutes}
          count={solve.firstAttempt.count}
        />
        <SolveTime
          label="Revisions"
          averageMinutes={solve.revision.averageMinutes}
          count={solve.revision.count}
          align="end"
        />
      </div>

      <RecallCoverage coverage={summary.recallCoverage} />
    </section>
  )
}

/**
 * How much of what you have practised you have actually written up.
 *
 * Lifetime figures, never windowed by the range picker above — so the block
 * says so rather than letting the picker imply otherwise, the same way the
 * mastered count does.
 */
function RecallCoverage({
  coverage,
}: {
  coverage: InsightsSummary["recallCoverage"]
}) {
  const gap = coverage.attemptedProblems - coverage.withCard

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">Recall coverage</h3>
        <span className="text-xs text-muted-foreground">
          All time — the range above does not apply
        </span>
      </div>

      {coverage.rate === null ? (
        <p className="text-sm text-muted-foreground">
          Nothing attempted yet, so there is nothing to write up.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-heading text-2xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber value={coverage.rate} decimals={0} suffix="%" />
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {coverage.withCard.toLocaleString()} of{" "}
              {coverage.attemptedProblems.toLocaleString()} attempted problems
              have a card
            </span>
          </div>

          {/* A bar rather than a second ring: this is a proportion read at a
              glance beside the completion ring, not competing with it. */}
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`Recall coverage ${coverage.rate}%`}
          >
            <div
              className="h-full rounded-full bg-state-mastered-foreground"
              style={{ width: `${Math.min(100, Math.max(0, coverage.rate))}%` }}
            />
          </div>

          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {gap > 0 && (
              <Link
                href="/problems?hasRecallCard=false"
                className="underline underline-offset-4 hover:text-foreground focus-visible:outline-none"
              >
                {gap.toLocaleString()} still to write up
              </Link>
            )}
            {coverage.needsUpdate > 0 && (
              <span className="text-state-overdue-foreground">
                {coverage.needsUpdate.toLocaleString()}{" "}
                {coverage.needsUpdate === 1 ? "card is" : "cards are"} stale
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dd className="font-heading text-2xl font-semibold tracking-tight">
        <AnimatedNumber value={value} label={`${value} ${label}`} />
      </dd>
      {/* The hint lives inside the <dt>: a <dl> grouping <div> may only hold
          <dt>/<dd>, and a bare <span> here breaks the list semantics. */}
      <dt className="flex flex-col gap-0.5 text-sm text-muted-foreground">
        {label}
        {hint && <span className="text-xs">{hint}</span>}
      </dt>
    </div>
  )
}

function SolveTime({
  label,
  averageMinutes,
  count,
  align = "start",
}: {
  label: string
  averageMinutes: number | null
  count: number
  /** `end` right-aligns the pair so it sits against the card's edge. */
  align?: "start" | "end"
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "end" && "sm:items-end sm:text-right",
      )}
    >
      <span className="font-heading text-xl font-semibold tracking-tight">
        <NullableNumber
          value={averageMinutes}
          decimals={1}
          suffix={averageMinutes === null ? undefined : " min"}
          emptyLabel="No attempts in this bucket"
        />
      </span>
      <span className="text-sm text-muted-foreground">
        {label} · {count.toLocaleString()}{" "}
        {count === 1 ? "attempt" : "attempts"}
      </span>
    </div>
  )
}
