import Link from "next/link"
import { NotebookPenIcon, PencilIcon, TriangleAlertIcon } from "lucide-react"

import { PatternChips } from "@/components/domain/pattern-chips"
import { buttonVariants } from "@/components/ui/button"
import type { EmbeddedRecallCard, PatternRef } from "@/lib/api/types"
import { formatInstant } from "@/lib/date"
import { cn } from "@/lib/utils"

/**
 * The written-up knowledge for a problem.
 *
 * Reads from the detail response — `recallCard` for the text, and the
 * problem's own `patterns` / `needsRecallUpdate`, which sit at the top level
 * because they also appear on every listing row. No second request.
 */
export function RecallCardPanel({
  problemId,
  card,
  patterns,
  needsRecallUpdate,
  timezone,
}: {
  problemId: string
  card: EmbeddedRecallCard | null
  patterns: PatternRef[]
  needsRecallUpdate: boolean
  timezone: string
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Recall card
        </h2>
        <Link
          href={`/problems/${problemId}/recall`}
          className={cn(
            buttonVariants({ variant: card ? "outline" : "default", size: "sm" }),
          )}
        >
          {card ? (
            <>
              <PencilIcon aria-hidden />
              Edit card
            </>
          ) : (
            <>
              <NotebookPenIcon aria-hidden />
              Write a card
            </>
          )}
        </Link>
      </div>

      {needsRecallUpdate && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-state-overdue-foreground/30 bg-state-overdue/40 px-3 py-2 text-sm text-state-overdue-foreground"
        >
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            This card is stale: you viewed a solution after writing it, so it is
            missing whatever you had to look up. Editing and saving clears the
            flag.
          </span>
        </p>
      )}

      {card ? (
        <div className="flex flex-col gap-4">
          <blockquote className="border-l-2 border-state-mastered-foreground/50 pl-3 text-base leading-relaxed font-medium">
            {card.keyInsight}
          </blockquote>

          {card.approach && (
            <Section label="Approach" body={card.approach} />
          )}
          {card.pitfalls && <Section label="Pitfalls" body={card.pitfalls} />}

          {(card.timeComplexity || card.spaceComplexity) && (
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {card.timeComplexity && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">Time</dt>
                  <dd className="font-mono">{card.timeComplexity}</dd>
                </div>
              )}
              {card.spaceComplexity && (
                <div className="flex items-baseline gap-2">
                  <dt className="text-muted-foreground">Space</dt>
                  <dd className="font-mono">{card.spaceComplexity}</dd>
                </div>
              )}
            </dl>
          )}

          {patterns.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Patterns</span>
              <PatternChips patterns={patterns} />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            {/* An instant, formatted against the owner's timezone — not the
                browser's. */}
            Last written {formatInstant(card.updatedAt, timezone)}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-border p-6">
          <p className="max-w-prose text-sm text-muted-foreground">
            Nothing written up yet. A card is the one line you reread before an
            interview — plus the approach, the pitfalls, and the techniques you
            used. It is independent of your attempt log and never changes when
            this problem is next due.
          </p>
        </div>
      )}
    </section>
  )
}

function Section({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground uppercase">
        {label}
      </h3>
      <p className="text-sm whitespace-pre-wrap">{body}</p>
    </div>
  )
}
