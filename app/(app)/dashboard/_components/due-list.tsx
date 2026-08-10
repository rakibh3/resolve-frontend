import Link from "next/link"

import { FadeInUp } from "@/components/motion/fade-in-up"
import { buttonVariants } from "@/components/ui/button"
import type { DueItem } from "@/lib/api/types"

import { DueProblemCard } from "./due-problem-card"

/**
 * The revision queue.
 *
 * `recommended` is the first five entries of `due` — a workload suggestion, not
 * a filter. Rendering them as two lists would double-count the same problems,
 * so the full list is rendered once and the recommended slice is simply the
 * part shown by default.
 */
export function DueList({
  due,
  recommendedCount,
  timezone,
}: {
  due: DueItem[]
  recommendedCount: number
  timezone: string
}) {
  const recommended = due.slice(0, recommendedCount)
  const rest = due.slice(recommendedCount)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          Suggested for today
        </h2>
        <p className="text-sm text-muted-foreground">
          {recommended.length} of {due.length} shown
          {due.length > recommended.length
            ? " — the rest are below"
            : due.length === 0
              ? ""
              : " — that is everything due"}
        </p>
      </div>

      {/* Server order is most-overdue-first. It is never re-sorted here. */}
      <ul className="grid gap-3 md:grid-cols-2">
        {recommended.map((item, index) => (
          <li key={item.id}>
            <FadeInUp index={index}>
              <DueProblemCard item={item} timezone={timezone} />
            </FadeInUp>
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="group rounded-xl border border-border bg-card/50">
          <summary className="interactive-lift cursor-pointer list-none px-4 py-3 text-sm font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Show the remaining {rest.length}{" "}
            {rest.length === 1 ? "problem" : "problems"} due
          </summary>
          <ul className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
            {rest.map((item) => (
              <li key={item.id}>
                <DueProblemCard item={item} timezone={timezone} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <div>
        <Link
          href="/problems"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Open the full library
        </Link>
      </div>
    </section>
  )
}
