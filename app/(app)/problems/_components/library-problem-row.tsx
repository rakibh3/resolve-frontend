import Link from "next/link"
import { EyeIcon } from "lucide-react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { PracticeStateBadge } from "@/components/domain/practice-state-badge"
import { stageLabel } from "@/components/domain/stage-label"
import { TopicChips } from "@/components/domain/topic-chips"
import type { Problem } from "@/lib/api/types"
import { formatLocalDate } from "@/lib/date"

/**
 * A library listing row — an explicit variant, not the due card with a flag.
 * This one answers "what is in my library and where does it stand", so it leads
 * with metadata and attempt count rather than urgency.
 */
export function LibraryProblemRow({ problem }: { problem: Problem }) {
  return (
    <article className="interactive-lift flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 has-focus-visible:ring-3 has-focus-visible:ring-ring/50 sm:flex-row sm:items-center sm:gap-4">
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

        <TopicChips topics={problem.topics} max={4} />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        {/* Rendered verbatim from the server, never re-derived from the date. */}
        <PracticeStateBadge state={problem.practiceState} />
      </div>
    </article>
  )
}
