/**
 * Cache tag constants.
 *
 * Nothing opts into tagged caching today: every read runs with `no-store` and
 * freshness after a mutation comes from `revalidatePath`. Tag invalidation
 * cannot express the one thing that most often makes ReSolve data stale — the
 * clock passing midnight in the owner's timezone, which silently turns every
 * `DUE` badge into `OVERDUE`.
 *
 * These constants exist so a specific view can opt into `force-cache` +
 * `revalidateTag` later without a refactor.
 */
export const tags = {
  dashboard: "dashboard",
  problems: "problems",
  problem: (id: string) => `problem:${id}`,
  topics: "topics",
  patterns: "patterns",
  recall: (id: string) => `recall:${id}`,
  recallSheet: "recall-sheet",
  insights: "insights",
  settings: "settings",
  reminder: "reminder",
} as const

/** Paths every attempt, reschedule, or problem mutation can invalidate. */
export const paths = {
  dashboard: "/dashboard",
  problems: "/problems",
  problem: (id: string) => `/problems/${id}`,
  recallEditor: (id: string) => `/problems/${id}/recall`,
  topics: "/topics",
  patterns: "/patterns",
  /** The pattern-grouped recall sheet. */
  recall: "/recall",
  insights: "/insights",
  settings: "/settings",
} as const

/**
 * Everything a recall-card write or delete makes stale.
 *
 * Deliberately excludes `/dashboard`: a card carries no schedule information,
 * so writing one can never move a due date or change a practice state. See
 * `docs/API_INTEGRATION.md` §1.5.
 */
export const RECALL_MUTATION_PATHS = [
  paths.problems,
  paths.recall,
  paths.patterns,
  paths.insights,
] as const
