import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { PatternWithCount } from "./types"

/**
 * The owner-authored technique vocabulary, ordered by problem count descending
 * then name — the order that makes filter chips useful and, here, also the
 * order that surfaces near-duplicates: hand-typed patterns accumulate variants
 * (`two-pointer` beside `two-pointers`) and the singletons pool at the bottom.
 *
 * `usedOnly` is sent as the literal string "true"; the backend treats any other
 * value, including "1", as false.
 *
 * There is no create and no delete endpoint. A pattern appears when a recall
 * card first names it and is left behind with `problemCount: 0` when the last
 * card drops it.
 */
export const listPatterns = cache(async (usedOnly = false) => {
  const { data } = await apiFetch<PatternWithCount[]>("/api/patterns", {
    query: usedOnly ? { usedOnly: "true" } : undefined,
  })
  return data
})
