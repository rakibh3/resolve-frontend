import type { Attempt, AttemptOutcome } from "@/lib/api/types"
import { formatInstant } from "@/lib/date"

import { AttemptRowActions } from "./attempt-row-actions"

const OUTCOME_COPY: Record<AttemptOutcome, string> = {
  SOLVED_INDEPENDENTLY: "Solved independently",
  SOLVED_WITH_HINT: "Solved with a hint",
  VIEWED_SOLUTION: "Viewed the solution",
}

export function AttemptHistory({
  problemId,
  attempts,
  timezone,
}: {
  problemId: string
  /** Newest first, as returned. */
  attempts: Attempt[]
  timezone: string
}) {
  if (attempts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No attempts logged yet. The first one starts the revision cycle.
      </p>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {attempts.map((attempt) => (
        <li
          key={attempt.id}
          className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium">
              {OUTCOME_COPY[attempt.outcome]}
            </span>
            <AttemptRowActions
              problemId={problemId}
              attempt={attempt}
              timezone={timezone}
            />
          </div>

          <p className="text-xs text-muted-foreground tabular-nums">
            {attempt.durationMinutes} min · confidence {attempt.confidence}/5 ·{" "}
            <time dateTime={attempt.attemptedAt}>
              {formatInstant(attempt.attemptedAt, timezone)}
            </time>
          </p>

          {attempt.notes && (
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {attempt.notes}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}
