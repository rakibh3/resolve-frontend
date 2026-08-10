import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { TodayDashboard } from "./types"

/**
 * Everything the Today screen needs in one request: due and overdue counts, the
 * full due list, the recommended slice of it, the streak, and the 7-day
 * lookahead — all derived from the owner's timezone server-side.
 */
export const getTodayDashboard = cache(async () => {
  const { data } = await apiFetch<TodayDashboard>("/api/dashboard/today")
  return data
})
