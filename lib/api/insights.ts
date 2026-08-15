import "server-only"

import { cache } from "react"

import { apiFetch } from "./http"
import type {
  ActivityInsights,
  BacklogInsights,
  InsightsSummary,
  LocalDate,
  PatternInsights,
  TopicInsights,
} from "./types"

/** The maximum span the API accepts for a ranged insights query. */
export const MAX_INSIGHTS_RANGE_DAYS = 365

export type InsightsRange = { from?: LocalDate; to?: LocalDate }

/**
 * Headline KPIs. Omitting both range bounds means "all time" for the windowed
 * metrics — but `mastered` is a current total either way, and so is the whole
 * `recallCoverage` block.
 */
export const getInsightsSummary = cache(async (range: InsightsRange = {}) => {
  const { data } = await apiFetch<InsightsSummary>("/api/insights/summary", {
    query: { from: range.from, to: range.to },
  })
  return data
})

/**
 * Per-topic performance and the derived weak subset.
 *
 * This endpoint takes no query parameters and is always all-time — sending a
 * range has no effect, so none is sent.
 */
export const getTopicInsights = cache(async () => {
  const { data } = await apiFetch<TopicInsights>("/api/insights/topics")
  return data
})

/**
 * Per-pattern performance and the derived weak subset — the same shape and the
 * same configured thresholds as topic insights, over techniques rather than
 * subject areas. Like topics, it takes no range and is always all-time.
 *
 * A pattern only exists once a recall card names it, so this view is empty
 * until the owner has written some cards.
 */
export const getPatternInsights = cache(async () => {
  const { data } = await apiFetch<PatternInsights>("/api/insights/patterns")
  return data
})

/**
 * Attempts per local day. Defaults to a trailing 365-day window, and always
 * returns concrete `range` bounds plus zero-count days already filled in.
 */
export const getActivityInsights = cache(async (range: InsightsRange = {}) => {
  const { data } = await apiFetch<ActivityInsights>("/api/insights/activity", {
    query: { from: range.from, to: range.to },
  })
  return data
})

/**
 * Overdue debt over time. Defaults to a trailing 30-day window — a different
 * default from activity's 365.
 */
export const getBacklogInsights = cache(async (range: InsightsRange = {}) => {
  const { data } = await apiFetch<BacklogInsights>("/api/insights/backlog", {
    query: { from: range.from, to: range.to },
  })
  return data
})
