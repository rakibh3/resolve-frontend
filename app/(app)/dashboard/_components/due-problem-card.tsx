import Link from "next/link"
import { EyeIcon } from "lucide-react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { PracticeStateBadge } from "@/components/domain/practice-state-badge"
import { stageLabel } from "@/components/domain/stage-label"
import { TopicChips } from "@/components/domain/topic-chips"
import type { DueItem } from "@/lib/api/types"
import { formatLocalDate, relativeDueLabel } from "@/lib/date"

import { QuickLogButton } from "./quick-log-button"

/**
 * A problem waiting to be revised, on the dashboard.
 *
 * An explicit variant rather than a `<ProblemCard compact />` flag: the due
 * card and the library row answer different questions and share nothing but
 * their badges.
 */
export function DueProblemCard({
  item,
  timezone,
}: {
  item: DueItem
  timezone: string
}) {
  return (
    <article className="interactive-press group flex flex-col gap-3 rounded-none border-2 border-foreground bg-card p-5 has-focus-visible:outline-2 has-focus-visible:outline-foreground has-focus-visible:outline-offset-2 shadow-[var(--shadow-neo)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href={`/problems/${item.id}`}
            transitionTypes={["nav-forward"]}
            className="font-medium tracking-tight hover:underline focus-visible:outline-none"
          >
            {item.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {item.source === "LEETCODE" ? "LeetCode" : "Custom"} ·{" "}
            {stageLabel(item.stage)} · due {formatLocalDate(item.dueDate)}
          </p>
        </div>

        <PracticeStateBadge state={item.practiceState} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={item.difficulty} />
        <TopicChips topics={item.topics} max={3} />
        {item.solutionViewed && (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="The solution was viewed at some point, which reset the cycle"
          >
            <EyeIcon className="size-3" aria-hidden />
            Solution seen
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
        {/* daysOverdue comes from the server, resolved against the owner's
            timezone. Nothing here subtracts dates. */}
        <span
          className={
            item.daysOverdue > 0
              ? "text-sm font-medium text-state-overdue-foreground"
              : "text-sm text-muted-foreground"
          }
        >
          {relativeDueLabel(item.daysOverdue)}
        </span>

        <QuickLogButton
          problemId={item.id}
          title={item.title}
          timezone={timezone}
        />
      </div>
    </article>
  )
}
