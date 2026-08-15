import "server-only"

import { apiFetch, type ApiResult } from "./http"
import type { SearchResult, SearchScope } from "./types"

export type SearchQuery = {
  q: string
  /** A single value, not a CSV list. Omitted means "every field". */
  scope?: SearchScope
  page?: number
  limit?: number
}

/**
 * Cross-entity search over everything the owner has written — problem titles
 * and statements, recall-card text, attempt notes, topic and pattern names.
 * `GET /api/problems?search=` only matches titles; this is the one that makes
 * months of accumulated notes retrievable.
 *
 * Deliberately **not** wrapped in `cache()`, unlike every other reader here.
 * The others are deduplicated because parallel Suspense boundaries in one
 * render ask for the same page of the same list; a search is a function of a
 * string the owner is still typing, so there is nothing to share and caching a
 * response would only risk showing it against a newer query.
 *
 * Caller contract: `q` must already satisfy the minimum length
 * (`isSearchable` in `lib/validation.ts`). Below it the API answers 400, and an
 * empty state is a better answer than an error boundary.
 */
export async function searchLibrary(
  query: SearchQuery,
): Promise<ApiResult<SearchResult[]>> {
  return apiFetch<SearchResult[]>("/api/search", {
    query: {
      q: query.q,
      scope: query.scope,
      page: query.page,
      limit: query.limit,
    },
    cache: "no-store",
  })
}
