import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type { RevisionEvent } from "./types"

/**
 * The full revision event log for one problem, newest first.
 *
 * Every event except `RESCHEDULED` is derived and is deleted and rewritten on
 * each schedule replay, so the `id`s are not stable — key rendered lists by
 * `type + createdAt`.
 */
export const listRevisions = cache(async (problemId: string) => {
  const { data } = await apiFetch<RevisionEvent[]>(
    `/api/problems/${problemId}/revisions`,
  )
  return data
})
