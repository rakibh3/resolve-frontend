import "server-only"

import { cache } from "react"

import { apiFetch, type ApiResult } from "./http"
import type { Attempt } from "./types"

/**
 * Paginated attempt history for one problem.
 *
 * `GET /api/problems/:id` already returns the full, unpaginated history, so
 * this is only for a dedicated paginated view.
 */
export const listAttempts = cache(
  async (
    problemId: string,
    query: { page?: number; limit?: number } = {},
  ): Promise<ApiResult<Attempt[]>> =>
    apiFetch<Attempt[]>(`/api/problems/${problemId}/attempts`, {
      query: { page: query.page, limit: query.limit },
    }),
)
