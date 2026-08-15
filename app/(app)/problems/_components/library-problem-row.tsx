import Link from "next/link"
import { EyeIcon, TriangleAlertIcon } from "lucide-react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { PatternChips } from "@/components/domain/pattern-chips"
import { PracticeStateBadge } from "@/components/domain/practice-state-badge"
import { stageLabel } from "@/components/domain/stage-label"
import { TopicChips } from "@/components/domain/topic-chips"
import { Badge } from "@/components/ui/badge"
import type { Problem } from "@/lib/api/types"
import { formatLocalDate } from "@/lib/date"

/**
 * A library listing row — an explicit variant, not the due card with a flag.
 * This one answers "what is in my library and where does it stand", so it leads
 * with metadata and attempt count rather than urgency.
 */
export function LibraryProblemRow({ problem }: { problem: Problem }) {
  return (
    <article className="interactive-press flex flex-col gap-2 border-b-2 border-foreground px-4 py-3 last:border-b-0 has-focus-visible:outline-2 has-focus-visible:outline-foreground has-focus-visible:outline-offset-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/problems/${problem.id}`}
            transitionTypes={["nav-forward"]}
            className="truncate font-medium tracking-tight hover:underline focus-visible:outline-none"
          >
            {problem.title}
          </Link>
          {problem.solutionViewed && (
            <EyeIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label="Solution viewed at some point"
            />
          )}
        </div>

        <p className="truncate text-xs text-muted-foreground">
          {/* Custom problems carry a free-text origin instead of a LeetCode link. */}
          {problem.source === "LEETCODE"
            ? "LeetCode"
            : (problem.sourceName ?? "Custom")}
          {" · "}
          {problem.attemptCount}{" "}
          {problem.attemptCount === 1 ? "attempt" : "attempts"}
          {problem.currentStage ? ` · ${stageLabel(problem.currentStage)}` : ""}
          {problem.nextDueDate
            ? ` · next ${formatLocalDate(problem.nextDueDate)}`
            : ""}
        </p>

        <div className="flex flex-wrap items-center gap-1">
          <TopicChips topics={problem.topics} max={3} />
          <PatternChips patterns={problem.patterns} max={2} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Only the stale case gets a badge here. "Has a card" is quiet good
            news and would add a chip to most rows for nothing; "the card is
            wrong" is the one worth interrupting a scan for. */}
        {problem.needsRecallUpdate && (
          <Badge
            className="bg-state-overdue text-state-overdue-foreground"
            title="You viewed a solution after writing this card, so it is out of date"
          >
            <TriangleAlertIcon aria-hidden />
            Stale card
          </Badge>
        )}
        <DifficultyBadge difficulty={problem.difficulty} />
        {/* Rendered verbatim from the server, never re-derived from the date. */}
        <PracticeStateBadge state={problem.practiceState} />
      </div>
    </article>
  )
}
