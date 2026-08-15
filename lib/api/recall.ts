import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type {
  Difficulty,
  PracticeState,
  RecallCard,
  RecallSheet,
} from "./types"

/**
 * One card, standalone.
 *
 * Most views never need this: `GET /api/problems/:id` already embeds the card's
 * text, and the problem carries `patterns` / `hasRecallCard` /
 * `needsRecallUpdate` at its top level. Reach for this only when the editor is
 * loaded without the detail page around it.
 *
 * A 404 here is ambiguous by design — "this problem has no card yet" and
 * "no such problem" differ only by `message`. Callers that care must branch on
 * the message; callers that don't should treat both as "nothing written yet".
 */
export const getRecallCard = cache(async (problemId: string) => {
  const { data } = await apiFetch<RecallCard>(
    `/api/problems/${problemId}/recall`,
  )
  return data
})

export type RecallSheetQuery = {
  /** Pattern **slugs**, comma-separated. */
  pattern?: readonly string[]
  /** Topic **slugs**, comma-separated. */
  topic?: readonly string[]
  /** A single value — this endpoint does not accept a CSV list here. */
  difficulty?: Difficulty
  /** A single value. Evaluated against today in the owner's timezone. */
  status?: PracticeState
}

/**
 * Every card the owner has written, grouped by pattern — the pre-interview
 * skim.
 *
 * Two properties of the response shape the UI:
 *
 * - A problem tagged with several patterns appears under **each** of them. The
 *   duplication is intentional; `totalCards` counts distinct cards, so never
 *   sum the group sizes to report a total.
 * - Cards with no pattern land in a trailing group whose `slug` is `null`. It
 *   is not a real pattern and has no page to link to.
 *
 * The scan is bounded and unpaginated; check `truncated` before implying the
 * result is everything.
 */
export const getRecallSheet = cache(async (query: RecallSheetQuery = {}) => {
  const { data } = await apiFetch<RecallSheet>("/api/recall/sheet", {
    query: {
      pattern: query.pattern,
      topic: query.topic,
      difficulty: query.difficulty,
      status: query.status,
    },
  })
  return data
})
