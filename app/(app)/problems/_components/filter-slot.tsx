import { ApiError } from "@/lib/api/http"
import { listPatterns } from "@/lib/api/patterns"
import { listTopics } from "@/lib/api/topics"
import type { PatternWithCount, TopicWithCount } from "@/lib/api/types"

import { FilterBar } from "./filter-bar"

/**
 * The filter vocabularies, fetched in parallel.
 *
 * Both come back already ordered by problem count descending — the order that
 * makes a long menu useful. A failure in either degrades to a filter bar
 * without those chips rather than taking the listing down with it.
 */
export async function FilterSlot() {
  const [topics, patterns] = await Promise.all([
    listTopics().catch(emptyOnApiError<TopicWithCount>()),
    listPatterns().catch(emptyOnApiError<PatternWithCount>()),
  ])

  return <FilterBar topics={topics} patterns={patterns} />
}

function emptyOnApiError<T>() {
  return (error: unknown): T[] => {
    if (!(error instanceof ApiError)) throw error
    return []
  }
}
