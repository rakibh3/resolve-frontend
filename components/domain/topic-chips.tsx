import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import type { TopicRef } from "@/lib/api/types"

/**
 * Topic tags. Filtering happens by `slug`; the `name` is what gets displayed.
 */
export function TopicChips({
  topics,
  max,
  linked = true,
}: {
  topics: TopicRef[]
  /** Truncate to this many, with a "+N" affordance for the rest. */
  max?: number
  linked?: boolean
}) {
  if (topics.length === 0) return null

  const shown = max ? topics.slice(0, max) : topics
  const hidden = topics.length - shown.length

  return (
    <ul className="flex flex-wrap items-center gap-1">
      {shown.map((topic) => (
        <li key={topic.slug}>
          {linked ? (
            <Badge
              variant="outline"
              render={<Link href={`/problems?topic=${topic.slug}`} />}
            >
              {topic.name}
            </Badge>
          ) : (
            <Badge variant="outline">{topic.name}</Badge>
          )}
        </li>
      ))}
      {hidden > 0 ? (
        <li>
          <Badge
            variant="ghost"
            title={topics
              .slice(shown.length)
              .map((topic) => topic.name)
              .join(", ")}
          >
            +{hidden}
          </Badge>
        </li>
      ) : null}
    </ul>
  )
}
