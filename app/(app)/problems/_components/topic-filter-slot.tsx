import { ApiError } from "@/lib/api/http"
import { listTopics } from "@/lib/api/topics"
import type { TopicWithCount } from "@/lib/api/types"

import { FilterBar } from "./filter-bar"

/**
 * The filter vocabulary comes from `GET /api/topics`, already ordered by
 * problem count descending — the order that makes chips useful.
 *
 * A failure here degrades to a filter bar without topic chips rather than
 * taking the listing down with it.
 */
export async function TopicFilterSlot() {
  let topics: TopicWithCount[]
  try {
    topics = await listTopics()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
    topics = []
  }

  return <FilterBar topics={topics} />
}
