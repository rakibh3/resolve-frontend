import Link from "next/link"
import { NotebookPenIcon, WaypointsIcon } from "lucide-react"

import { FadeInUp } from "@/components/motion/fade-in-up"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { listPatterns } from "@/lib/api/patterns"
import { cn } from "@/lib/utils"

import { RenamePattern } from "./rename-pattern"

export async function PatternList({ usedOnly }: { usedOnly: boolean }) {
  const patterns = await listPatterns(usedOnly)

  if (patterns.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-8">
        <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <WaypointsIcon className="size-5" aria-hidden />
        </span>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          {usedOnly ? "No patterns are in use" : "No patterns yet"}
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          A pattern appears the first time you name one on a recall card — there
          is no way to add one directly, and none are imported from LeetCode.
          Write up a problem you have solved and the technique you used will
          show up here.
        </p>
        <Link
          href="/problems?hasRecallCard=false"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <NotebookPenIcon aria-hidden />
          Find a problem to write up
        </Link>
      </div>
    )
  }

  return (
    // Server order: problem count descending, then name. Never re-sorted —
    // that ordering is what pools the near-duplicate singletons at the bottom,
    // which is the cue to merge them.
    <ul className="overflow-hidden rounded-xl border border-border bg-card">
      {patterns.map((pattern, index) => (
        <li key={pattern.id}>
          <FadeInUp
            index={index}
            className="interactive-press flex items-center gap-3 border-b-2 border-foreground px-4 py-3 last:border-b-0 has-focus-visible:outline-2 has-focus-visible:outline-foreground has-focus-visible:outline-offset-2"
          >
            <Link
              // Filter by slug; display the name.
              href={`/problems?pattern=${pattern.slug}`}
              transitionTypes={["nav-forward"]}
              className="flex min-w-0 flex-1 items-center gap-2 focus-visible:outline-none"
            >
              <span className="truncate font-medium hover:underline">
                {pattern.name}
              </span>
              <code className="truncate text-xs text-muted-foreground">
                {pattern.slug}
              </code>
            </Link>

            <Link
              href={`/recall?pattern=${pattern.slug}`}
              className="hidden text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-none sm:inline"
            >
              Review cards
            </Link>

            <Badge
              variant={pattern.problemCount === 0 ? "ghost" : "outline"}
              className={cn(
                "tabular-nums",
                pattern.problemCount === 0 && "text-muted-foreground italic",
              )}
            >
              {pattern.problemCount === 0
                ? "0 · unused"
                : `${pattern.problemCount} ${pattern.problemCount === 1 ? "problem" : "problems"}`}
            </Badge>

            <RenamePattern pattern={pattern} allPatterns={patterns} />
          </FadeInUp>
        </li>
      ))}
    </ul>
  )
}
