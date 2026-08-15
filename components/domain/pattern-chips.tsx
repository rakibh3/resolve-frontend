import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import type { PatternRef } from "@/lib/api/types"

/**
 * Pattern tags — the owner's technique vocabulary.
 *
 * Visually distinct from `<TopicChips>` on purpose. A topic ("Array") and a
 * pattern ("Two Pointers") read alike as words but answer different questions,
 * and the two are filtered through different query params. Rendering both as
 * plain outline badges would make a row of chips ambiguous, so patterns carry
 * the accent fill and a `#` marker that topics never use.
 *
 * Filtering happens by `slug`; the `name` is what gets displayed.
 */
export function PatternChips({
  patterns,
  max,
  linked = true,
}: {
  patterns: PatternRef[]
  /** Truncate to this many, with a "+N" affordance for the rest. */
  max?: number
  linked?: boolean
}) {
  if (patterns.length === 0) return null

  const shown = max ? patterns.slice(0, max) : patterns
  const hidden = patterns.length - shown.length

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {shown.map((pattern) => (
        <li key={pattern.slug}>
          <Badge
            // The hover override is not redundant: the `default` variant ships
            // `[a]:hover:bg-primary/80`, which would otherwise win back the
            // colour the moment the chip becomes a link.
            className="gap-0.5 bg-state-reinforcement text-state-reinforcement-foreground [a]:hover:bg-state-reinforcement/70"
            {...(linked
              ? { render: <Link href={`/problems?pattern=${pattern.slug}`} /> }
              : {})}
          >
            <span aria-hidden className="opacity-60">
              #
            </span>
            {pattern.name}
          </Badge>
        </li>
      ))}
      {hidden > 0 ? (
        <li>
          <Badge
            variant="ghost"
            title={patterns
              .slice(shown.length)
              .map((pattern) => pattern.name)
              .join(", ")}
          >
            +{hidden}
          </Badge>
        </li>
      ) : null}
    </ul>
  )
}
