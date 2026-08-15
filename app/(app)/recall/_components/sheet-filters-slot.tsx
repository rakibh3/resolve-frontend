import { ApiError } from "@/lib/api/http"
import { listPatterns } from "@/lib/api/patterns"
import { listTopics } from "@/lib/api/topics"
import type { PatternWithCount, TopicWithCount } from "@/lib/api/types"

import { SheetFilters } from "./sheet-filters"

/**
 * Both vocabularies for the filter menus, fetched in parallel.
 *
 * A failure in either degrades to a filter bar without those chips rather than
 * taking the sheet down — the sheet is the page, the filters are an
 * affordance.
 */
export async function SheetFiltersSlot() {
  const [patterns, topics] = await Promise.all([
    listPatterns(true).catch(rethrowUnlessApi<PatternWithCount>()),
    listTopics(true).catch(rethrowUnlessApi<TopicWithCount>()),
  ])

  return <SheetFilters patterns={patterns} topics={topics} />
}

function rethrowUnlessApi<T>() {
  return (error: unknown): T[] => {
    if (!(error instanceof ApiError)) throw error
    return []
  }
}
