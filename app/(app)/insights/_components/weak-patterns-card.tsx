import Link from "next/link"
import { NotebookPenIcon } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { getPatternInsights } from "@/lib/api/insights"
import { cn } from "@/lib/utils"

import { VocabularyInsightCard } from "./vocabulary-insight-card"

/**
 * The same analysis as weak topics, over techniques rather than subject areas —
 * "you are slow with monotonic stacks", not "you are slow with arrays".
 *
 * Patterns only exist once a recall card names one, so an empty result here
 * means "write some cards", not "practise more". That is why the empty state
 * differs from the topic card's.
 */
export async function WeakPatternsCard() {
  const insights = await getPatternInsights()

  return (
    <VocabularyInsightCard
      title="Weak patterns"
      noun="patterns"
      entries={insights.patterns}
      weakEntries={insights.weakPatterns}
      thresholds={insights.thresholds}
      hrefFor={(slug) => `/problems?pattern=${slug}`}
      emptyState={
        <div className="flex flex-col items-start gap-3 rounded-none border-2 border-dashed border-foreground p-5 shadow-[var(--shadow-neo-sm)]">
          <p className="max-w-prose text-sm text-muted-foreground">
            No patterns yet. Unlike topics, these are not imported — a pattern
            appears the first time you name one on a recall card, and this card
            starts reporting once a few exist.
          </p>
          <Link
            href="/problems?hasRecallCard=false"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <NotebookPenIcon aria-hidden />
            Find a problem to write up
          </Link>
        </div>
      }
    />
  )
}
