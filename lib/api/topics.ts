import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { TopicWithCount } from "./types"

/**
 * The global topic vocabulary, ordered by problem count descending then name —
 * which is the order you want for filter chips.
 *
 * `usedOnly` is sent as the literal string "true"; the backend treats any other
 * value, including "1", as false.
 */
export const listTopics = cache(async (usedOnly = false) => {
  const { data } = await apiFetch<TopicWithCount[]>("/api/topics", {
    query: usedOnly ? { usedOnly: "true" } : undefined,
  })
  return data
})
