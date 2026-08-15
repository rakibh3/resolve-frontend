import Link from "next/link"
import {
  BookOpenIcon,
  NotebookPenIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { DifficultyBadge } from "@/components/domain/difficulty-badge"
import { PracticeStateBadge } from "@/components/domain/practice-state-badge"
import { FadeInUp } from "@/components/motion/fade-in-up"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { ApiError } from "@/lib/api/http"
import { getRecallSheet, type RecallSheetQuery } from "@/lib/api/recall"
import type { RecallSheetEntry, RecallSheetGroup } from "@/lib/api/types"
import { cn } from "@/lib/utils"

export async function RecallSheet({
  query,
  hasFilters,
}: {
  query: RecallSheetQuery
  hasFilters: boolean
}) {
  let sheet
  try {
    sheet = await getRecallSheet(query)
  } catch (error) {
    // A 400 here means the URL carries an invalid difficulty or status —
    // recoverable, and worth explaining rather than throwing to the boundary.
    if (error instanceof ApiError && error.isValidationError) {
      return (
        <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-destructive/40 p-6">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Those filters aren&rsquo;t valid
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            {error.message}
          </p>
          <Link
            href="/recall"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Reset filters
          </Link>
        </div>
      )
    }
    throw error
  }

  if (sheet.totalCards === 0) {
    return hasFilters ? <NoMatches /> : <NothingWritten />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {/* `totalCards` counts distinct cards. Summing the groups would
              double-count every problem carrying more than one pattern. */}
          <strong className="font-medium text-foreground tabular-nums">
            {sheet.totalCards}
          </strong>{" "}
          {sheet.totalCards === 1 ? "card" : "cards"} across{" "}
          <span className="tabular-nums">{sheet.groups.length}</span>{" "}
          {sheet.groups.length === 1 ? "group" : "groups"}
        </p>

        {sheet.truncated && (
          <p
            role="status"
            className="flex items-start gap-1.5 rounded-lg border border-warning/40 bg-warning/40 px-2.5 py-1.5 text-xs text-warning-foreground"
          >
            <TriangleAlertIcon className="mt-px size-3 shrink-0" aria-hidden />
            The scan hit its cap, so this is not every card you have written.
            Filter by pattern or topic to see the rest.
          </p>
        )}
      </div>

      {sheet.groups.map((group, index) => (
        <PatternGroup
          // The untagged group's slug is null, so it cannot be the key.
          key={group.slug ?? "__untagged"}
          group={group}
          index={index}
        />
      ))}
    </div>
  )
}

function PatternGroup({
  group,
  index,
}: {
  group: RecallSheetGroup
  index: number
}) {
  return (
    <FadeInUp
      index={index}
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight">
          {group.slug ? (
            // Only a real pattern has a page to link to.
            <Link
              href={`/problems?pattern=${group.slug}`}
              className="hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {group.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">{group.name}</span>
          )}
          <Badge variant="outline" className="tabular-nums">
            {group.cards.length}
          </Badge>
        </h2>

        {!group.slug && (
          <p className="text-xs text-muted-foreground">
            Cards with no pattern named yet
          </p>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {group.cards.map((card) => (
          <CardRow key={card.problemId} card={card} />
        ))}
      </ul>
    </FadeInUp>
  )
}

function CardRow({ card }: { card: RecallSheetEntry }) {
  return (
    <li className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/problems/${card.problemId}`}
          transitionTypes={["nav-forward"]}
          className="font-medium tracking-tight hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {card.title}
        </Link>
        <DifficultyBadge difficulty={card.difficulty} />
        <PracticeStateBadge state={card.practiceState} />
        {card.needsRecallUpdate && (
          <Badge
            className="bg-state-overdue text-state-overdue-foreground"
            title="You viewed a solution after writing this card"
          >
            <TriangleAlertIcon aria-hidden />
            Stale
          </Badge>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{card.keyInsight}</p>

      {(card.timeComplexity || card.spaceComplexity) && (
        <p className="font-mono text-xs text-muted-foreground">
          {card.timeComplexity ?? "—"} time · {card.spaceComplexity ?? "—"}{" "}
          space
        </p>
      )}
    </li>
  )
}

function NothingWritten() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
      <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <BookOpenIcon className="size-5" aria-hidden />
      </span>
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        No cards written yet
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        This sheet collects what you have written up, grouped by the technique
        you used — the thing to skim the night before an interview. It fills in
        as you write cards on problems you have already solved.
      </p>
      <Link
        href="/problems?hasRecallCard=false"
        className={cn(buttonVariants({ size: "sm" }))}
      >
        <NotebookPenIcon aria-hidden />
        Find a problem to write up
      </Link>
    </div>
  )
}

function NoMatches() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        No cards match these filters
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        This view only ever shows problems you have written up, so a filter that
        matches problems in your library can still come back empty here. Try
        dropping the difficulty or status filter first.
      </p>
      <Link
        href="/recall"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Clear filters
      </Link>
    </div>
  )
}
