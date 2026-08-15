import "server-only"

import { cache } from "react"

import { apiFetch, type ApiResult } from "./http"
import type {
  Difficulty,
  PracticeState,
  Problem,
  ProblemDetail,
  ProblemSource,
} from "./types"

export type ProblemSortBy = "createdAt" | "title" | "difficulty" | "nextDueAt"
export type SortOrder = "asc" | "desc"

export const PROBLEM_SORT_FIELDS: readonly ProblemSortBy[] = [
  "createdAt",
  "title",
  "difficulty",
  "nextDueAt",
]

export type ProblemListQuery = {
  page?: number
  limit?: number
  /** Serialized comma-separated. */
  difficulty?: readonly Difficulty[]
  /**
   * Serialized comma-separated. Any status filter implicitly excludes problems
   * that have never been attempted — they have no revision cycle.
   */
  status?: readonly PracticeState[]
  /** Single value, not a list. */
  source?: ProblemSource
  /** Topic **slugs**, comma-separated. Matches problems tagged with any of them. */
  topic?: readonly string[]
  /**
   * Pattern **slugs**, comma-separated. Matches problems whose *recall card* is
   * tagged with any of them — a problem with no card can never match.
   */
  pattern?: readonly string[]
  /** Sent as the string literals "true" / "false". */
  solutionViewed?: boolean
  /**
   * Sent as the string literals "true" / "false". `false` is the "attempted but
   * never written up" backlog.
   */
  hasRecallCard?: boolean
  /**
   * Case-insensitive `contains` on the title only. To match note and card text,
   * use `searchLibrary` in `./search` instead.
   */
  search?: string
  sortBy?: ProblemSortBy
  sortOrder?: SortOrder
}

/**
 * The library listing. Returns `meta` alongside the rows so the caller can
 * render pagination from the server's totals.
 */
export const listProblems = cache(
  async (query: ProblemListQuery): Promise<ApiResult<Problem[]>> =>
    apiFetch<Problem[]>("/api/problems", {
      query: {
        page: query.page,
        limit: query.limit,
        difficulty: query.difficulty,
        status: query.status,
        source: query.source,
        topic: query.topic,
        pattern: query.pattern,
        solutionViewed: query.solutionViewed,
        hasRecallCard: query.hasRecallCard,
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    }),
)

/**
 * The detail view: metadata, the recall card, the full attempt history, the
 * full revision event log, and the projected 6-stage timeline — all in one
 * request. There is no need to call the standalone recall endpoint alongside
 * it.
 */
export const getProblem = cache(async (id: string) => {
  const { data } = await apiFetch<ProblemDetail>(`/api/problems/${id}`)
  return data
})
